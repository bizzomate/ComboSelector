define([
    "dojo/store/util/QueryResults",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred"], function (QueryResults, declare, dojoLang, dojoArray, Deferred) {
        var XpathStore = declare("ComboSelector.lib.XpathStore", [], {
            id: "",
            dataSourceXpath: "",
            dataSourceXpathLimit: "",
            sortParams: "",
            associationDisplay: "",
            XpathDeferred: "",
            data: "",

            constructor: function (options) {
                this.id = options.caller + '.XpathStore';
                this.dataSourceXpath = options.dataSourceXpath;
                this.dataSourceXpathLimit = options.dataSourceXpathLimit;;
                this.sortParams = options.sortParams;
                this.associationDisplay = options.associationDisplay;
                logger.debug(this.id + ".constructor");
            },
            query: function (query, options) {
                logger.debug(this.id + ".query");
                this.XpathDeferred = new Deferred();
                this.getResults(query);
                return QueryResults(this.XpathDeferred);
            },
            getResults: function (query) {
                logger.debug(this.id + ".getResults");
                if (query.name) {
                    var
                        searchString = query.name.toString().replace(/\'/g, '&#39;').replace(/\"/g, '&#34;'),
                        xpathQuery = this.dataSourceXpath + "[contains(" + this.associationDisplay + ", '" + searchString + "')]";
                    mx.data.get({
                        xpath: xpathQuery,
                        filter: {
                            sort: this.sortParams,
                            limit: this.dataSourceXpathLimit,
                            attributes: [this.associationDisplay]
                        },
                        callback: dojoLang.hitch(this, this.processResults)
                    });
                } else if (query.guid) {
                    mx.data.get({
                        guid: query.guid,
                        callback: dojoLang.hitch(this, this.processSingleResult)
                    })
                }
            },
            processResults: function (objs) {
                logger.debug(this.id + ".processResults");
                this.data = [];
                if (objs) {
                    for (var i = 0; i < objs.length; i++) {
                        this.data.push({
                            id: objs[i].getGuid(),
                            name: objs[i].get(this.associationDisplay)
                        });
                    }
                }
                this.XpathDeferred.resolve(this.data);
            },
            processSingleResult: function (obj) {
                logger.debug(this.id + ".processSingleResult");
                this.data = [];
                if (obj) {
                    this.data.push({
                        id: obj.getGuid(),
                        name: obj.get(this.associationDisplay)
                    });
                }
                this.XpathDeferred.resolve(this.data);
            },
            get: function (param) {
                logger.debug(this.id + ".get");
                var filtered = dojoArray.filter(this.data, function (item) {
                    return item.id == param;
                });
                return filtered[0];
            }
        });

        return XpathStore;
    });
