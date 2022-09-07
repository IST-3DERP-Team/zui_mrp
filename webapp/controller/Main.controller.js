sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    'sap/ui/model/Sorter',
    "sap/ui/Device",
    "sap/ui/table/library",
    "sap/m/TablePersoController",
    'sap/m/MessageToast',
	'sap/m/SearchField'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController, MessageToast, SearchField) {
        "use strict";

        var _this;

        // shortcut for sap.ui.table.SortOrder
        var SortOrder = library.SortOrder;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });

        return Controller.extend("zuimrp.controller.Main", {
            onInit: function () {
                _this = this;
                this.initializeComponent();

                this._oSortDialog = null;
                this._oFilterDialog = null;
                this._oViewSettingsDialog = {};

                this._aEntitySet = {
                    mrpHdr: "MRPHeaderSet", mrpDtl: "MRPDetailSet"
                };

                this._aColumns = {};
                this._aSortableColumns = {};
                this._aFilterableColumns = {};

                this.getColumns();
                
                this._oDataBeforeChange = {};
                this._aInvalidValueState = [];
            },

            initializeComponent() {
                // Add header search field
                var oSmartFilter = this.getView().byId("sfbMRP");

                if (oSmartFilter) {
                    oSmartFilter.attachFilterChange(function(oEvent) {});

                    var oBasicSearchField = new SearchField();
                    oBasicSearchField.attachLiveChange(function(oEvent) {
                        this.getView().byId("sfbMRP").fireFilterChange(oEvent);
                    }.bind(this));

                    oSmartFilter.setBasicSearch(oBasicSearchField);
                }

                var oModel = this.getOwnerComponent().getModel("MRPFilters");
                oSmartFilter.setModel(oModel);
            },

            onSearchMrpHdr() {
                var aFilters = this.getView().byId("sfbMRP").getFilters();
                this.getMrpHdr(aFilters);
            },

            getMrpHdr(pFilters) {
                var oModel = this.getOwnerComponent().getModel();
                oModel.read('/MRPHeaderViewSet', {
                    success: function (data, response) {
                        console.log("MRPHeaderViewSet", data)
                        data.results.forEach((item, index) => {
                            if (index === 0) {
                                item.Active = true;
                            }
                            else {
                                item.Active = false;
                            }
                        });

                        var oJSONModel = new sap.ui.model.json.JSONModel();
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "mrpHdr");

                        _this.onFilterBySmart(pFilters);
                        
                        _this.getView().setModel(new JSONModel({
                            activeTransNo: data.results[0].Transno,
                            activeTransItm: data.results[0].Transitm,
                            activePlantCd: data.results[0].Plantcd,
                            activeMatNo: data.results[0].Matno
                        }), "ui");

                        
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            onFilterBySmart(pFilters) {
                var oFilter = null;
                var aFilter = [];
                var aFilterGrp = [];

                pFilters[0].aFilters.forEach(x => {
                    if (Object.keys(x).includes("aFilters")) {
                        x.aFilters.forEach(y => {
                            var sName = this._aColumns["mrpHdr"].filter(item => item.name.toUpperCase() == y.sPath.toUpperCase())[0].name;
                            aFilter.push(new Filter(sName, FilterOperator.EQ, y.oValue1));
                        });
                        var oFilterGrp = new Filter(aFilter, false);
                        aFilterGrp.push(oFilterGrp);
                        aFilter = [];
                    } else {
                        var sName = this._aColumns["mrpHdr"].filter(item => item.name.toUpperCase() == x.sPath.toUpperCase())[0].name;
                        aFilter.push(new Filter(sName, FilterOperator.EQ, x.oValue1));
                    }
                });
                
                if (aFilterGrp.length == 0) oFilter = new Filter(aFilter, false);
                else oFilter = new Filter(aFilterGrp, true);

                this.byId("mrpHdrTab").getBinding("rows").filter(oFilter, "Application");
            },

            onFilterByGlobal() {

            },

            onFilterByCol() {

            },

            getMrpDtl() {
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oEntitySet = "/MRPDetailViewSet";

                var sPlantCd = this.getView().getModel("ui").getData().activePlant;
                var sMatNo = this.getView().getModel("ui").getData().activeMatNo;

                oModel.read(oEntitySet, {
                    urlParameters: {
                        "$filter": "Plantcd eq '" + sPlantCd + "' and Matno eq '" + sMatNo + "'"
                    },
                    success: function (data, response) {
                        console.log("MRPDetailViewSet", data);

                        var oJSONModel = new sap.ui.model.json.JSONModel();
                        oJSONModel.setData(data);

                        _this.getView().setModel(oJSONModel, "mrpDtl");
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            getColumns: async function() {
                var oModelColumns = new JSONModel();
                var sPath = jQuery.sap.getModulePath("zuimrp", "/model/columns.json")
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();
                var oModel = this.getOwnerComponent().getModel();

                oModel.metadataLoaded().then(() => {
                    var oService = oModel.getServiceMetadata().dataServices.schema.filter(item => item.namespace === "ZGW_3DERP_MRP_SRV");
                    
                    var oMetadata = oService[0].entityType.filter(item => item.name === "MRPHeaderView");
                    if (oMetadata.length > 0) { 
                        var aColumns = this.initColumns(oColumns["mrpHdr"], oMetadata[0]);
                        this._aColumns["mrpHdr"] = aColumns["columns"];
                        this._aSortableColumns["mrpHdr"] = aColumns["sortableColumns"];
                        this._aFilterableColumns["mrpHdr"] = aColumns["filterableColumns"];
                        this.onAddColumns(this.byId("mrpHdrTab"), aColumns["columns"], "mrpHdr");
                    }

                    oMetadata = oService[0].entityType.filter(item => item.name === "MRPDetailView");
                    if (oMetadata.length > 0) { 
                        var aColumns = this.initColumns(oColumns["mrpDtl"], oMetadata[0]);
                        this._aColumns["mrpDtl"] = aColumns["columns"];
                        this._aSortableColumns["mrpDtl"] = aColumns["sortableColumns"];
                        this._aFilterableColumns["mrpDtl"] = aColumns["filterableColumns"];
                        this.onAddColumns(this.byId("mrpDtlTab"), aColumns["columns"], "mrpDtl");
                    }
                })
            },

            initColumns: function(arg1, arg2) {
                var oColumn = arg1;
                var oMetadata = arg2;
                
                var aSortableColumns = [];
                var aFilterableColumns = [];
                var aColumns = [];
                
                oMetadata.property.forEach((prop, idx) => {
                    var vCreatable = prop.extensions.filter(item => item.name === "creatable");
                    var vUpdatable = prop.extensions.filter(item => item.name === "updatable");
                    var vSortable = prop.extensions.filter(item => item.name === "sortable");
                    var vFilterable = prop.extensions.filter(item => item.name === "filterable");
                    var vName = prop.extensions.filter(item => item.name === "label")[0].value;
                    var oColumnLocalProp = oColumn.filter(col => col.name === prop.name);
                    var vShowable = oColumnLocalProp.length === 0 ? true :  oColumnLocalProp[0].showable;

                    if (vShowable) {
                        //sortable
                        if (vSortable.length === 0 || vSortable[0].value === "true") {
                            aSortableColumns.push({
                                name: prop.name, 
                                label: vName, 
                                position: oColumnLocalProp.length === 0 ? idx: oColumnLocalProp[0].position, 
                                sorted: oColumnLocalProp.length === 0 ? false : oColumnLocalProp[0].sort === "" ? false : true,
                                sortOrder: oColumnLocalProp.length === 0 ? "" : oColumnLocalProp[0].sort
                            });
                        }

                        //filterable
                        if (vFilterable.length === 0 || vFilterable[0].value === "true") {
                            aFilterableColumns.push({
                                name: prop.name, 
                                label: vName, 
                                position: oColumnLocalProp.length === 0 ? idx : oColumnLocalProp[0].position,
                                value: "",
                                connector: "Contains"
                            });
                        }
                    }

                    //columns
                    aColumns.push({
                        name: prop.name, 
                        label: vName, 
                        position: oColumnLocalProp.length === 0 ? idx : oColumnLocalProp[0].position,
                        type: oColumnLocalProp.length === 0 ? prop.type : oColumnLocalProp[0].type,
                        creatable: vCreatable.length === 0 ? true : vCreatable[0].value === "true" ? true : false,
                        updatable: vUpdatable.length === 0 ? true : vUpdatable[0].value === "true" ? true : false,
                        sortable: vSortable.length === 0 ? true : vSortable[0].value === "true" ? true : false,
                        filterable: vFilterable.length === 0 ? true : vFilterable[0].value === "true" ? true : false,
                        visible: oColumnLocalProp.length === 0 ? true : oColumnLocalProp[0].visible,
                        required: oColumnLocalProp.length === 0 ? false : oColumnLocalProp[0].required,
                        width: oColumnLocalProp.length === 0 ? "150px" : oColumnLocalProp[0].width,
                        sortIndicator: oColumnLocalProp.length === 0 ? "None" : oColumnLocalProp[0].sort,
                        hideOnChange: oColumnLocalProp.length === 0 ? false : oColumnLocalProp[0].hideOnChange,
                        valueHelp: oColumnLocalProp.length === 0 ? {"show": false} : oColumnLocalProp[0].valueHelp,
                        expression: oColumnLocalProp.length === 0 ? {"show": false} : oColumnLocalProp[0].expression,
                        showable: oColumnLocalProp.length === 0 ? true : oColumnLocalProp[0].showable,
                        key: oMetadata.key.propertyRef.filter(item => item.name === prop.name).length === 0 ? false : true
                    })
                })

                // Columns in columns.json not included in metadata
                oColumn.forEach((prop, idx) => {
                    if (aColumns.filter(x => x.name == prop.name).length == 0) {
                        var vCreatable = prop.creatable;
                        var vUpdatable = prop.updatable;
                        var vSortable = prop.sortable;
                        var vFilterable = prop.filterable;
                        var vName = prop.label;
                        var oColumnLocalProp = oColumn.filter(col => col.name === prop.name);
                        var vShowable = oColumnLocalProp.length === 0 ? true :  oColumnLocalProp[0].showable;

                        if (vShowable) {
                            //sortable
                            if (vSortable) {
                                aSortableColumns.push({
                                    name: prop.name, 
                                    label: vName, 
                                    position: oColumnLocalProp.length === 0 ? idx: oColumnLocalProp[0].position, 
                                    sorted: oColumnLocalProp.length === 0 ? false : oColumnLocalProp[0].sort === "" ? false : true,
                                    sortOrder: oColumnLocalProp.length === 0 ? "" : oColumnLocalProp[0].sort
                                });
                            }
    
                            //filterable
                            if (vFilterable) {
                                aFilterableColumns.push({
                                    name: prop.name, 
                                    label: vName, 
                                    position: oColumnLocalProp.length === 0 ? idx : oColumnLocalProp[0].position,
                                    value: "",
                                    connector: "Contains"
                                });
                            }
                        }

                        //columns
                        aColumns.push({
                            name: prop.name, 
                            label: vName, 
                            position: oColumnLocalProp.length === 0 ? idx : oColumnLocalProp[0].position,
                            type: oColumnLocalProp.length === 0 ? prop.type : oColumnLocalProp[0].type,
                            creatable: vCreatable,
                            updatable: vUpdatable,
                            sortable: vSortable,
                            filterable: vFilterable,
                            visible: oColumnLocalProp.length === 0 ? true : oColumnLocalProp[0].visible,
                            required: oColumnLocalProp.length === 0 ? false : oColumnLocalProp[0].required,
                            width: oColumnLocalProp.length === 0 ? "150px" : oColumnLocalProp[0].width,
                            sortIndicator: oColumnLocalProp.length === 0 ? "None" : oColumnLocalProp[0].sort,
                            hideOnChange: oColumnLocalProp.length === 0 ? false : oColumnLocalProp[0].hideOnChange,
                            valueHelp: oColumnLocalProp.length === 0 ? {"show": false} : oColumnLocalProp[0].valueHelp,
                            expression: oColumnLocalProp.length === 0 ? {"show": false} : oColumnLocalProp[0].expression,
                            showable: oColumnLocalProp.length === 0 ? true : oColumnLocalProp[0].showable,
                            key: false
                        })
                    }
                })

                aSortableColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                this.createViewSettingsDialog("sort", 
                    new JSONModel({
                        items: aSortableColumns,
                        rowCount: aSortableColumns.length,
                        activeRow: 0,
                        table: ""
                    })
                );

                aFilterableColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                this.createViewSettingsDialog("filter", 
                    new JSONModel({
                        items: aFilterableColumns,
                        rowCount: aFilterableColumns.length,
                        table: ""
                    })
                );

                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                var aColumnProp = aColumns.filter(item => item.showable === true);

                this.createViewSettingsDialog("column", 
                    new JSONModel({
                        items: aColumnProp,
                        rowCount: aColumnProp.length,
                        table: ""
                    })
                );
                
                return { columns: aColumns, sortableColumns: aSortableColumns, filterableColumns: aFilterableColumns };
            },

            onAddColumns(table, columns, model) {
                var aColumns = columns.filter(item => item.showable === true)

                aColumns.forEach(col => {
                    if (col.type === "Edm.String") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"})
                        }));
                    }
                    else if (col.type === "Edm.Decimal") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "End",
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"})
                        }));
                    }
                    else if (col.type === "Edm.Boolean" ) {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "Center",
                            sortProperty: col.name,
                            filterProperty: col.name,                            
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.CheckBox({selected: "{" + model + ">" + col.name + "}", editable: false})
                        }));
                    }
                })
            },

            onCellClickMrpHr: function(oEvent) {
                var sPlantCd = oEvent.getParameters().rowBindingContext.getObject().Plantcd;
                var sMatNo = oEvent.getParameters().rowBindingContext.getObject().Matno;

                this.getView().getModel("ui").setProperty("/activePlantCd", sPlantCd);
                this.getView().getModel("ui").setProperty("/activeMatNo", sMatNo);

                //this.setActiveRowColor("mrpHdrTab", oEvent.getParameters().rowIndex);

                this.getMRPDetail();
            },

            createViewSettingsDialog: function (arg1, arg2) {
                var sDialogFragmentName = null;

                if (arg1 === "sort") sDialogFragmentName = "zuimrp.view.SortDialog";
                else if (arg1 === "filter") sDialogFragmentName = "zuimrp.view.FilterDialog";
                else if (arg1 === "column") sDialogFragmentName = "zuimrp.view.ColumnDialog";

                var oViewSettingsDialog = this._oViewSettingsDialog[sDialogFragmentName];

                if (!oViewSettingsDialog) {
                    oViewSettingsDialog = sap.ui.xmlfragment(sDialogFragmentName, this);
                    
                    if (Device.system.desktop) {
                        oViewSettingsDialog.addStyleClass("sapUiSizeCompact");
                    }

                    oViewSettingsDialog.setModel(arg2);

                    this._oViewSettingsDialog[sDialogFragmentName] = oViewSettingsDialog;
                    this.getView().addDependent(oViewSettingsDialog);
                }
            },
            
            getConnector(args) {
                var oConnector;

                switch (args) {
                    case "EQ":
                        oConnector = sap.ui.model.FilterOperator.EQ
                        break;
                      case "Contains":
                        oConnector = sap.ui.model.FilterOperator.Contains
                        break;
                      default:
                        // code block
                        break;
                }

                return oConnector;
            },

            
        });

            // onToggleSearchField: function (oEvent) {
            //     var oSearchField = this.oFilterBar.getBasicSearch();
            //     var oBasicSearch;
            //     if (!oSearchField) {
            //         oBasicSearch = new SearchField({
            //             showSearchButton: false
            //         });
            //     } else {
            //         oSearchField = null;
            //     }
    
            //     this.oFilterBar.setBasicSearch(oBasicSearch);
    
            //     oBasicSearch.attachBrowserEvent("keyup", function (e) {
            //             if (e.which === 13) {
            //                 this.onSearch();
            //             }
            //         }.bind(this)
            //     );
            // },

            // fFetchData: function () {
            //     var oJsonParam;
            //     var oJsonData = [];
            //     var sGroupName;
            //     var oItems = this.getAllFilterItems(true);
    
            //     for (var i = 0; i < oItems.length; i++) {
            //         oJsonParam = {};
            //         sGroupName = null;
            //         if (oItems[i].getGroupName) {
            //             sGroupName = oItems[i].getGroupName();
            //             oJsonParam.groupName = sGroupName;
            //         }
    
            //         oJsonParam.name = oItems[i].getName();
    
            //         var oControl = this.determineControlByFilterItem(oItems[i]);
            //         if (oControl) {
            //             oJsonParam.value = oControl.getValue();
            //             oJsonData.push(oJsonParam);
            //         }
            //     }
    
            //     return oJsonData;
            // },

            // fApplyData: function (oJsonData) {

            //     var sGroupName;
    
            //     for (var i = 0; i < oJsonData.length; i++) {
    
            //         sGroupName = null;
    
            //         if (oJsonData[i].groupName) {
            //             sGroupName = oJsonData[i].groupName;
            //         }
    
            //         var oControl = this.determineControlByName(oJsonData[i].name, sGroupName);
            //         if (oControl) {
            //             oControl.setValue(oJsonData[i].value);
            //         }
            //     }
            // },
    
            // fGetFiltersWithValues: function () {
            //     var i;
            //     var oControl;
            //     var aFilters = this.getFilterGroupItems();
    
            //     var aFiltersWithValue = [];
    
            //     for (i = 0; i < aFilters.length; i++) {
            //         oControl = this.determineControlByFilterItem(aFilters[i]);
            //         if (oControl && oControl.getValue && oControl.getValue()) {
            //             aFiltersWithValue.push(aFilters[i]);
            //         }
            //     }
    
            //     return aFiltersWithValue;
            // },
    
            // fVariantStub: function () {
            //     var oVM = this.oFilterBar._oVariantManagement;
            //     oVM.initialise = function () {
            //         this.fireEvent("initialise");
            //         this._setStandardVariant();
    
            //         this._setSelectedVariant();
            //     };
    
            //     var nKey = 0;
            //     var mMap = {};
            //     var sCurrentVariantKey = null;
            //     oVM._oVariantSet = {
    
            //         getVariant: function (sKey) {
            //             return mMap[sKey];
            //         },
            //         addVariant: function (sName) {
            //             var sKey = "" + nKey++;
    
            //             var oVariant = {
            //                 key: sKey,
            //                 name: sName,
            //                 getItemValue: function (s) {
            //                     return this[s];
            //                 },
            //                 setItemValue: function (s, oObj) {
            //                     this[s] = oObj;
            //                 },
            //                 getVariantKey: function () {
            //                     return this.key;
            //                 }
            //             };
            //             mMap[sKey] = oVariant;
    
            //             return oVariant;
            //         },
    
            //         setCurrentVariantKey: function (sKey) {
            //             sCurrentVariantKey = sKey;
            //         },
    
            //         getCurrentVariantKey: function () {
            //             return sCurrentVariantKey;
            //         },
    
            //         delVariant: function (sKey) {
            //             if (mMap[sKey]) {
            //                 delete mMap[sKey];
            //             }
            //         }
    
            //     };
            // },

            // getFilterPlant() {
            //     var oModel = this.getOwnerComponent().getModel();               
            //     oModel.read('/MRPPlantSet', {
            //         success: function (data, response) {
            //             console.log("MRPPlantSet", data)
            //             var oJSONModel = new sap.ui.model.json.JSONModel();
            //             oJSONModel.setData(data);

            //             _this.getView().setModel(oJSONModel, "mrpPlant");
            //         },
            //         error: function (err) { }
            //     })
            // },

            // getFilterPurchGrp() {
            //     var oModel = this.getOwnerComponent().getModel();               
            //     oModel.read('/MRPPurchGroupSet', {
            //         success: function (data, response) {
            //             console.log("MRPPurchGroupSet", data)
            //             var oJSONModel = new sap.ui.model.json.JSONModel();
            //             oJSONModel.setData(data);

            //             _this.getView().setModel(oJSONModel, "mrpPurchGrp");
            //         },
            //         error: function (err) { }
            //     })
            // },

            // getFilterIO() {
            //     var oModel = this.getOwnerComponent().getModel();               
            //     oModel.read('/MRPIOSet', {
            //         success: function (data, response) {
            //             console.log("MRPIOSet", data)
            //             var oJSONModel = new sap.ui.model.json.JSONModel();
            //             oJSONModel.setData(data);

            //             _this.getView().setModel(oJSONModel, "mrpIO");
            //         },
            //         error: function (err) { }
            //     })
            // },
    });
