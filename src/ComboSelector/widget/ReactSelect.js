import {
    defineWidget,
    log,
    runCallback,
    getData,
} from 'widget-base-helpers';

import React from 'react';
import ReactDOM from 'react-dom';
import AsyncSelect from 'react-select/lib/Async';
import lang from 'dojo/_base/lang';

import template from './ReactSelect.template.html';


export default defineWidget('ReactSelect', template, {
    // Set in Modeler
    label: '',
    associationEntity: '',
    associationDisplay: '',
    dataSourceXpath: '',
    dataSourceXpathLimit: '',
    dataSourceXpathSort: '',
    displayTemplate: '',
    displayTemplateParams: '',

    _obj: null,
    _params: null,
    _association: null,
    _entity: null,

    constructor() {
        this.log = log.bind(this);
        this.runCallback = runCallback.bind(this);
        this._parseMxObjects = this._parseMxObjects.bind(this);
        this._handleChange = this._handleChange.bind(this);
    },

    postCreate() {
        log.call(this, 'postCreate', this._WIDGET_VERSION);

        this._association = this.associationEntity.split("/")[ 0 ];
        this._entity = this.associationEntity.split("/")[ 1 ];

        this._params = {
            xpath: "//" + this._entity + this.dataSourceXpath,
            filter: {
                sort: [],
                offset: 0,
                amount: this.dataSourceXpathLimit,
                attributes: [this.associationDisplay],
            },
        };

        for(const sortParam of this.dataSourceXpathSort) {
            this._params.filter.sort.push([sortParam.dataSourceXpathSortAttribute, sortParam.dataSourceXpathSortOrder]);
        }

        for(const templateParam of this.displayTemplateParams) {
            if (-1 === this._params.filter.attributes.indexOf(templateParam.displayTemplateValue)) {
                this._params.filter.attributes.push(templateParam.displayTemplateValue);
            }
        }
    },

    update(obj, cb) {
        log.call(this, 'update', this._WIDGET_VERSION);

        this._obj = obj;
        this._params.xpath.replace(/\[%CurrentObject%\]/g, obj.getGuid());

        const promiseOptions = inputValue => {
            let xpathString = this._params.xpath;
            if (inputValue) {
                const inputString = inputValue.replace(/'/g, '&#39;').replace(/"/g, '&#34;');
                xpathString += "[contains(" + this.associationDisplay + ", '" + inputString + "')]";
            }
            const inputParams = lang.mixin(lang.clone(this._params), {
                xpath: xpathString,
            });
            return getData(inputParams).then(this._parseMxObjects);
        };

        ReactDOM.render(<AsyncSelect
            isClearable
            cacheOptions
            defaultOptions
            classNamePrefix='react-select'
            loadOptions={promiseOptions}
            onChange={this._handleChange} />, this.domNode);
        this.runCallback(cb);
    },

    _handleChange(selectedOption) {
        log.call(this, '_handleChange', this._WIDGET_VERSION);
        console.log(selectedOption.value);
    },

    _parseMxObjects(objs) {
        log.call(this, '_parseMxObjects', this._WIDGET_VERSION);

        const results = [];
        for (const obj of objs){
            let label;
            if (this.displayTemplate && this.displayTemplate.length){
                label = this.displayTemplate;
                for (const templateParam of this.displayTemplateParams){
                    const regex = new RegExp('{' + templateParam.displayTemplateKey + '}', 'g');
                    label = label.replace(regex, obj.get(templateParam.displayTemplateValue));
                }
            } else {
                label = obj.get(this.associationDisplay);
            }
            results.push({
                value: obj.getGuid(),
                label: label,
            });
        }
        return results;
    },
});
