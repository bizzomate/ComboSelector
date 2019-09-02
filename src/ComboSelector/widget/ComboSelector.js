/*global logger*/
/*
    ComboSelector
    ========================

    @file      : ComboSelector.js
    @version   : 1.2.2
    @author    : Jelle Dekker
    @date      : 2018/09/05
    @copyright : Bizzomate 2018
    @license   : Apache 2

    Documentation
    ========================
    An alternative to the Mx ReferenceSelector that filters the dropdown list based on the user input.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "mxui/dom",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/html",
    "dojo/_base/event",
    "dojo/store/Memory",
    "dijit/form/ComboBox",

    "ComboSelector/lib/XpathStore",
    "dojo/text!ComboSelector/widget/template/ComboSelector.html"
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoClass, dojoConstruct, dojoArray, dojoLang, dojoHtml, dojoEvent, dojoMemory, dojoComboBox, XpathStore, widgetTemplate) {
    "use strict";

    // Declare widget's prototype.
    return declare("ComboSelector.widget.ComboSelector", [_WidgetBase, _TemplatedMixin], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements
        inputLabel: null,
        inputWrapper: null,

        // Parameters configured in the Modeler.
        associationEntity: "",
        associationDisplay: "",
        dataSourceMicroflow: "",
        labelCaption: "",
        labelWidth: "",
        displayEnum: "",
        onChangeMF: "",
        placeholderText: "",
        autoComplete: "",
        searchDelay: "",
        reloadDataAttribute: "",
        reloadDataAssociation: "",
        dataSourceSelection: "",
        dataSourceXpath: "",
        dataSourceXpathLimit: "",
        dataSourceXpathSort: "",
        dataSourceXpathSortAttribute: "",
        dataSourceXpathSortOrder: "",
        dataSourceXpathExecution: "",
        reloadOnRefresh: "",
        searchMethod: "",


        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _contextObj: null,
        _alertDiv: null,
        _readOnly: false,
        _callback: null,
        _comboBoxStore: null,
        _comboBox: null,
        _association: null,
        _entity: null,
        _sortParams: null,
        _searchMethodWidget: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            // Uncomment the following line to enable debug messages
            //logger.level(logger.DEBUG);

            logger.debug(this.id + ".constructor");
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            logger.debug(this.id + ".postCreate");

            if (this.readOnly || this.get("disabled") || this.readonly) {
                this._readOnly = true;
            }

            if (this.labelCaption && this.labelCaption.trim().length) {
                this.inputLabel.innerHTML = this.labelCaption;
            } else {
                dojoConstruct.destroy(this.inputLabel);
            }

            if (this.displayEnum === "horizontal") {
                dojoClass.add(this.inputLabel, "col-sm-" + this.labelWidth);
                dojoClass.add(this.inputWrapper, "col-sm-" + (12 - this.labelWidth));
            }

            if (this.dataSourceSelection == "dataSourceMicroflow" || this.dataSourceXpathExecution == "widget"){
                this._searchMethodWidget = (this.searchMethod == 'contains' ? "*${0}*" : "${0}*");
            } else {
                this._searchMethodWidget = (this.searchMethod == 'contains' ? "contains" : "starts-with");
            }

            this._association = this.associationEntity.split("/")[0];
            this._entity = this.associationEntity.split("/")[1];

            this._sortParams = [];
            if (this.dataSourceSelection == "dataSourceXpath" && this.dataSourceXpathExecution == "xpath") {
                dojoArray.forEach(this.dataSourceXpathSort, dojoLang.hitch(this, function (sortParam) {
                    this._sortParams.push([sortParam.dataSourceXpathSortAttribute, sortParam.dataSourceXpathSortOrder]);
                }));
            }

            this._updateRendering();
            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._callback = callback;
            this._resetSubscriptions();
            if (!this._readOnly && this._contextObj) {
                if (this.reloadOnRefresh || !this._comboBoxStore) {
                    this._loadData();
                } else {
                    this._executeCallback(callback, "update");
                }
            } else {
                this._updateRendering(this._callback);
            }
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function () {
            logger.debug(this.id + ".enable");
        },

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function () {
            logger.debug(this.id + ".disable");
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {
            logger.debug(this.id + ".resize");
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
            logger.debug(this.id + ".uninitialize");
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
        },

        //Load the data via the defined data source
        _loadData: function () {
            logger.debug(this.id + "._loadData");
            if (this.dataSourceSelection == "dataSourceMicroflow") {
                this._execMf(this.dataSourceMicroflow, this._contextObj.getGuid(), this._buildDataStore);
            } else if (this.dataSourceSelection == "dataSourceXpath" && this.dataSourceXpathExecution == "xpath") {
                this._comboBoxStore = new XpathStore({
                    caller: this.id,
                    dataSourceXpath: '//' + this._entity + this.dataSourceXpath.replace(/\[%CurrentObject%\]/g, this._contextObj.getGuid()),
                    dataSourceXpathLimit: this.dataSourceXpathLimit,
                    sortParams: this._sortParams,
                    associationDisplay: this.associationDisplay,
                    searchMethod: this._searchMethodWidget
                });
                this._buildComboBox();
            } else if (this.dataSourceSelection == "dataSourceXpath" && this.dataSourceXpathExecution == "widget") {
                mx.data.get({
                    xpath: "//" + this._entity + this.dataSourceXpath.replace(/\[%CurrentObject%\]/g, this._contextObj.getGuid()),
                    filter: {
                        sort: this._sortParams,
                        limit: this.dataSourceXpathLimit,
                        attributes: [this.associationDisplay]
                    },
                    callback: dojoLang.hitch(this, this._buildDataStore)
                });
            }
        },

        _sortData: function (x, y) {
            logger.debug(this.id + "._sortData");
            return ((x.name == y.name) ? 0 : ((x.name > y.name) ? 1 : -1));
        },

        _buildDataStore: function (objs) {
            logger.debug(this.id + "._buildDataStore");
            var data = [];
            if (objs) {
                for (var i = 0; i < objs.length; i++) {
                    data.push({
                        id: objs[i].getGuid(),
                        name: objs[i].get(this.associationDisplay)
                    });
                }
            }
            if (this.dataSourceSelection == "dataSourceXpath" && this.dataSourceXpathExecution == "widget") {
                data.sort(dojoLang.hitch(this, this._sortData));
            }
            if (!this._comboBoxStore) {
                this._comboBoxStore = new dojoMemory();
            }
            this._comboBoxStore.setData(data);
            this._buildComboBox();
        },

        _buildComboBox: function () {
            logger.debug(this.id + "._buildComboBox");
            if (!this._comboBox) {
                this._comboBox = new dojoComboBox({
                    store: this._comboBoxStore,
                    queryExpr: (this.dataSourceSelection == "dataSourceXpath" && this.dataSourceXpathExecution == "xpath" ? "${0}" : this._searchMethodWidget),
                    searchAttr: "name",
                    autoComplete: this.autoComplete,
                    searchDelay: this.searchDelay
                });
                dojoConstruct.place(this._comboBox.domNode, this.inputWrapper);
                dojoClass.add(this._comboBox.domNode, 'form-control');
                this._comboBox.on("Change", dojoLang.hitch(this, this._comboBoxOnChange));
                this._comboBox.on("Blur", dojoLang.hitch(this, this._comboBoxOnBlur));
                this._comboBox.on("Click", dojoLang.hitch(this, this._comboBoxOnClick));
                if (!/Trident/i.test(navigator.userAgent)) {
                    this._comboBox.focusNode.placeholder = this.placeholderText;
                }
            }
            this._updateRendering(this._callback);
        },

        _comboBoxOnChange: function (value) {
            logger.debug(this.id + "._comboBoxOnChange");
            var
                comboBoxGuid = (this._comboBox.item ? this._comboBox.item.id : null),
                currentGuid = this._contextObj.get(this._association);

            if (comboBoxGuid && comboBoxGuid != currentGuid) {
                this._contextObj.set(this._association, comboBoxGuid);
                this._execMf(this.onChangeMF, this._contextObj.getGuid());
            } else if (!comboBoxGuid && currentGuid) {
                this._contextObj.removeReferences(this._association, currentGuid);
                this._execMf(this.onChangeMF, this._contextObj.getGuid());
            }
        },

        _comboBoxOnBlur: function (value) {
            logger.debug(this.id + "._comboBoxOnBlur");
            var
                comboBoxGuid = (this._comboBox.item ? this._comboBox.item.id : null),
                currentGuid = this._contextObj.get(this._association);
            if (!comboBoxGuid) {
                this._comboBox.set("item", null);
                if (currentGuid) {
                    this._contextObj.removeReferences(this._association, currentGuid);
                    this._execMf(this.onChangeMF, this._contextObj.getGuid());
                }
            }
        },

        _comboBoxOnClick: function (value) {
            logger.debug(this.id + "._comboBoxOnClick");
            this._comboBox.toggleDropDown();
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function (e) {
            logger.debug(this.id + "._stopBubblingEventOnMobile");
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        // Attach events to HTML dom elements
        _setupEvents: function () {
            logger.debug(this.id + "._setupEvents");

        },

        // Rerender the interface.
        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");
            this.inputLabel.disabled = this._readOnly;

            if (this._contextObj && this.associationEntity) {
                this._contextObj.fetch(this.associationEntity, dojoLang.hitch(this, function (value) {
                    var
                        displayValue = (value ? value.get(this.associationDisplay) : ""),
                        guid = (value ? value.getGuid() : null);
                    if (this._readOnly) {
                        dojoHtml.set(this.inputWrapper, "<p class='form-control-static'>" + displayValue + "</p>");
                        dojoClass.add(this.inputWrapper, "readonly");
                    } else if (this._comboBoxStore) {
                        dojoClass.remove(this.inputWrapper, "readonly");
                        var item = this._comboBoxStore.get(guid);
                        if (item && typeof item != "undefined") {
                            if (this._comboBox.item != item) {
                                this._comboBox.set("item", item);
                            }
                        } else if (this.dataSourceSelection == "dataSourceXpath" && this.dataSourceXpathExecution == "xpath") {
                            this._comboBoxStore.query({ 'guid': guid }).then(dojoLang.hitch(this, function () {
                                this._comboBox.set("item", this._comboBoxStore.get(guid))
                            }));
                        }
                    }
                }));
            }

            // Important to clear all validations!
            this._clearValidations();

            // The callback, coming from update, needs to be executed, to let the page know it finished rendering
            this._executeCallback(callback, "_updateRendering");
        },

        _getComboBoxItemByGuid: function (guid) {
            logger.debug(this.id + "._getComboBoxItemByGuid");
            var item = this._comboBoxStore.get(guid);
            if (typeof item == null && this.dataSourceSelection == "dataSourceXpath" && this.dataSourceXpathExecution == "xpath") {
                this._comboBoxStore.query({ 'guid': guid });
                item = this._comboBoxStore.get(guid);
            }
            return item;
        },

        // Handle validations.
        _handleValidation: function (validations) {
            logger.debug(this.id + "._handleValidation");
            this._clearValidations();

            var validation = validations[0],
                message = validation.getReasonByAttribute(this._association);

            if (!this._readOnly && message) {
                this._addValidation(message);
            }
            validation.removeAttribute(this._association);
        },

        //Reload the data.
        _reloadData: function () {
            logger.debug(this.id + "._reloadData");
            this._clearValidations();
            this._loadData();
        },

        // Clear validations.
        _clearValidations: function () {
            logger.debug(this.id + "._clearValidations");
            dojoConstruct.destroy(this._alertDiv);
            this._alertDiv = null;
        },

        // Show an error message.
        _showError: function (message) {
            logger.debug(this.id + "._showError");
            if (this._alertDiv !== null) {
                dojoHtml.set(this._alertDiv, message);
                return true;
            }
            this._alertDiv = dojoConstruct.create("div", {
                "class": "alert alert-danger mx-validation-message",
                "innerHTML": message
            });
            dojoConstruct.place(this._alertDiv, this.domNode);
        },

        // Add a validation.
        _addValidation: function (message) {
            logger.debug(this.id + "._addValidation");
            this._showError(message);
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            this.unsubscribeAll();

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });

                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this._association,
                    callback: dojoLang.hitch(this, function (guid, attr, attrValue) {
                        this._updateRendering();
                    })
                });

                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: dojoLang.hitch(this, this._handleValidation)
                });

                if (this.reloadDataAttribute && this.reloadDataAttribute.trim().length) {
                    this.subscribe({
                        guid: this._contextObj.getGuid(),
                        attr: this.reloadDataAttribute,
                        callback: dojoLang.hitch(this, function (guid, attr, attrValue) {
                            this._reloadData();
                        })
                    });
                }
                if (this.reloadDataAssociation && this.reloadDataAssociation.trim().length) {
                    this.subscribe({
                        guid: this._contextObj.getGuid(),
                        attr: this.reloadDataAssociation.split("/")[0],
                        callback: dojoLang.hitch(this, function (guid, attr, attrValue) {
                            this._reloadData();
                        })
                    });
                }
            }
        },

        _execMf: function (mf, guid, cb) {
            logger.debug(this.id + "._execMf" + (mf ? ": " + mf : ""));
            if (mf && guid) {
                mx.ui.action(mf, {
                    params: {
                        applyto: "selection",
                        guids: [guid]
                    },
                    callback: (cb && typeof cb === "function" ? dojoLang.hitch(this, cb) : null),
                    error: function (error) {
                        console.debug(error.description);
                    }
                }, this);
            }
        },

        _executeCallback: function (cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        }
    });
});

require(["ComboSelector/widget/ComboSelector"]);
