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
        var _startUpInfo;
        var _aReserveList = [];
        var _aForMrList = [];

        // shortcut for sap.ui.table.SortOrder
        var SortOrder = library.SortOrder;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });

        return Controller.extend("zuimrp.controller.Main", {
            onInit: function () {
                _this = this;

                var oModelStartUp= new sap.ui.model.json.JSONModel();
                oModelStartUp.loadData("/sap/bc/ui2/start_up").then(() => {
                    _startUpInfo = oModelStartUp.oData
                    // console.log(oModelStartUp.oData.id);
                    // console.log(oModelStartUp.oData);
                });

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

                this.getColumnsConfig();
                
                this._oDataBeforeChange = {};
                this._aInvalidValueState = [];
            },

            initializeComponent() {
                // Add header search field
                var oSmartFilter = this.getView().byId("sfbMRP");

                if (oSmartFilter) {
                    oSmartFilter.attachFilterChange(function(oEvent) {});

                    // var oBasicSearchField = new SearchField();
                    // oBasicSearchField.attachLiveChange(function(oEvent) {
                    //     this.getView().byId("sfbMRP").fireFilterChange(oEvent);
                    // }.bind(this));

                    // oSmartFilter.setBasicSearch(oBasicSearchField);
                }

                var oModel = this.getOwnerComponent().getModel("MRPFilters");
                oSmartFilter.setModel(oModel);
            },

            onSFBInitialise() {
                this.getSbu();
            },

            getSbu() {
                var oModel = this.getOwnerComponent().getModel();
                var oEntitySet = "/SBUSet";

                oModel.read(oEntitySet, {
                    success: function (data, response) {
                        //console.log("getSbu", data);
                        
                        if (data.results.length > 0) {
                            var sbu = data.results[0].Sbu;
                            
                            if (sbu.toUpperCase() == "VER") {
                                _this.getView().byId("filterPlant").setFilterType("single");
                                //console.log("single", _this.getView().byId("filterPlant").getFilterType())
                            }
                        }
                    },
                    error: function (err) { }
                })
            },

            onSearchMrpHdr(oEvent) {
                var aFilters = this.getView().byId("sfbMRP").getFilters();
                var sFilterGlobal = oEvent.getSource()._oBasicSearchField.mProperties.value;
                //console.log("onSearchMrpHdr", aFilters, sQuery)
                this.getMrpHdr(aFilters, sFilterGlobal);
            },

            getMrpHdr(pFilters, pFilterGlobal) {
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

                        _this.onFilterBySmart(pFilters, pFilterGlobal);
                        
                        _this.getView().setModel(new JSONModel({
                            activeTransNo: data.results[0].Transno,
                            activeTransItm: data.results[0].Transitm,
                            activePlantCd: data.results[0].Plantcd,
                            activeMatNo: data.results[0].Matno,
                            activeHdrRowPath: "/results/0"
                        }), "ui");

                        
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            onFilterBySmart(pFilters, pFilterGlobal) {
                var oFilter = null;
                var aFilter = [];
                var aFilterGrp = [];
                var aFilterCol = [];

                pFilters[0].aFilters.forEach(x => {
                    if (Object.keys(x).includes("aFilters")) {
                        x.aFilters.forEach(y => {
                            var sName = this._aColumns["mrpHdr"].filter(item => item.name.toUpperCase() == y.sPath.toUpperCase())[0].name;
                            aFilter.push(new Filter(sName, FilterOperator.EQ, y.oValue1));

                            //if (!aFilterCol.includes(sName)) aFilterCol.push(sName);
                        });
                        var oFilterGrp = new Filter(aFilter, false);
                        aFilterGrp.push(oFilterGrp);
                        aFilter = [];
                    } else {
                        var sName = this._aColumns["mrpHdr"].filter(item => item.name.toUpperCase() == x.sPath.toUpperCase())[0].name;
                        aFilter.push(new Filter(sName, FilterOperator.EQ, x.oValue1));
                        var oFilterGrp = new Filter(aFilter, false);
                        aFilterGrp.push(oFilterGrp);
                        aFilter = [];

                        //if (!aFilterCol.includes(sName)) aFilterCol.push(sName);
                    }
                });

                if (pFilterGlobal) {
                    this._aFilterableColumns["mrpHdr"].forEach(item => {
                        var sDataType = this._aColumns["mrpHdr"].filter(col => col.name === item.name)[0].type;
                        if (sDataType === "Edm.Boolean") aFilter.push(new Filter(item.name, FilterOperator.EQ, pFilterGlobal));
                        else aFilter.push(new Filter(item.name, FilterOperator.Contains, pFilterGlobal));
                    })

                    var oFilterGrp = new Filter(aFilter, false);
                    aFilterGrp.push(oFilterGrp);
                    aFilter = [];
                }
                
                // if (aFilterGrp.length == 0) oFilter = new Filter(aFilter, false);
                // else oFilter = new Filter(aFilterGrp, true);

                oFilter = new Filter(aFilterGrp, true);

                this.byId("mrpHdrTab").getBinding("rows").filter(oFilter, "Application");
            },

            onFilterByCol() {

            },

            getMrpDtl() {
                // var oModel = this.getOwnerComponent().getModel();
                // var oJSONModel = new JSONModel();
                // var oEntitySet = "/MRPDetailViewSet";

                // var sPlantCd = this.getView().getModel("ui").getData().activePlant;
                // var sMatNo = this.getView().getModel("ui").getData().activeMatNo;

                // oModel.read(oEntitySet, {
                //     urlParameters: {
                //         "$filter": "Plantcd eq '" + sPlantCd + "' and Matno eq '" + sMatNo + "'"
                //     },
                //     success: function (data, response) {
                //         console.log("MRPDetailViewSet", data);

                //         var oJSONModel = new sap.ui.model.json.JSONModel();
                //         oJSONModel.setData(data);

                //         _this.getView().setModel(oJSONModel, "mrpDtl");
                //     },
                //     error: function (err) { 
                //         console.log("error", err)
                //     }
                // })
            },

            getColumnsConfig() {
                // this._aColumnsSvc = [];
                
                // // MRP Header column config
                // setTimeout(() => {
                //     var oModelMrpHdr = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                //     oModelMrpHdr.setHeaders({
                //         sbu: 'VER',
                //         type: 'MRPMOD',
                //         tabname: 'ZDV_3DERP_MRPHDR'
                //     });

                //     oModelMrpHdr.read("/ColumnsSet", {
                //         success: function (oData, oResponse) {
                //             console.log("ColumnsSet", oData);
                //             _this._aColumnsSvc["mrpHdrCol"] = oData.results;
                //         },
                //         error: function (err) { }
                //     });
                // }, 50);

                // // MRP Detail column config
                // setTimeout(() => {
                //     var oModelMrpDtl = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                //     oModelMrpDtl.setHeaders({
                //         sbu: 'VER',
                //         type: 'MRPDTLMOD',
                //         tabname: 'ZDV_3DERP_MRPDTL'
                //     });

                //     oModelMrpDtl.read("/ColumnsSet", {
                //         success: function (oData, oResponse) {
                //             _this._aColumnsSvc["mrpDtlCol"] = oData.results;
                //             this.getColumns();
                //         },
                //         error: function (err) { }
                //     });
                // }, 50);

                this.getColumns();
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

                        this.setRowReadMode("mrpHdr");
                    }

                    oMetadata = oService[0].entityType.filter(item => item.name === "MRPDetailView");
                    if (oMetadata.length > 0) { 
                        var aColumns = this.initColumns(oColumns["mrpDtl"], oMetadata[0]);
                        this._aColumns["mrpDtl"] = aColumns["columns"];
                        this._aSortableColumns["mrpDtl"] = aColumns["sortableColumns"];
                        this._aFilterableColumns["mrpDtl"] = aColumns["filterableColumns"];
                        this.onAddColumns(this.byId("mrpDtlTab"), aColumns["columns"], "mrpDtl");

                        this.setRowReadMode("mrpDtl");
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

                    // var sLabel = _this._aColumnsSvc[sModelName + "Col"].filter(
                    //     x => x.ColumnName.toUpperCase() == prop.name.toUpperCase())[0].ColumnLabel;
                    // var vName = sLabel; //prop.extensions.filter(item => item.name === "label")[0].value;
                    var vName = prop.extensions.filter(item => item.name === "label")[0].value;;
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
                        key: oMetadata.key.propertyRef.filter(item => item.name === prop.name).length === 0 ? false : true,
                        maxLength: prop.maxLength !== undefined ? prop.maxLength : null,
                        precision: prop.precision !== undefined ? prop.precision : null,
                        scale: prop.scale !== undefined ? prop.scale : null
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
                            key: false,
                            maxLength: null,
                            precision: null,
                            scale: null
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
                            label: new sap.m.Text({text: col.label})
                            //template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"})
                        }));
                    }
                    else if (col.type === "Edm.Decimal") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "End",
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label})
                            //template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"})
                        }));
                    }
                    else if (col.type === "Edm.Boolean" ) {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "Center",
                            sortProperty: col.name,
                            filterProperty: col.name,                            
                            label: new sap.m.Text({text: col.label})
                            //template: new sap.m.CheckBox({selected: "{" + model + ">" + col.name + "}", editable: false})
                        }));
                    }
                })
            },

            onCellClickMrpHr: function(oEvent) {
                var sPlantCd = oEvent.getParameters().rowBindingContext.getObject().Plantcd;
                var sMatNo = oEvent.getParameters().rowBindingContext.getObject().Matno;
                var sTransNo = oEvent.getParameters().rowBindingContext.getObject().Transno;
                var sTransItm = oEvent.getParameters().rowBindingContext.getObject().Transitm;

                this.getView().getModel("ui").setProperty("/activePlantCd", sPlantCd);
                this.getView().getModel("ui").setProperty("/activeMatNo", sMatNo);
                this.getView().getModel("ui").setProperty("/activeTransNo", sTransNo);
                this.getView().getModel("ui").setProperty("/activeTransItm", sTransItm);
                this.getView().getModel("ui").setProperty("/activeHdrRowPath", oEvent.getParameters().rowBindingContext.sPath);

                var aMrpDtl = {results: []};
                var aReserveList = jQuery.extend(true, [], _aReserveList);

                aMrpDtl.results.push(...aReserveList.filter(x => x.Plantcd == sPlantCd && x.Matno == sMatNo));
                aMrpDtl.results.forEach(item => {
                    var aFormr = _aForMrList.filter(x => x.Plantcd == item.Plantcd && x.Matno == item.Matno && 
                        x.Sloc == item.Sloc && x.Batch == item.Batch);
                    if (aFormr && aFormr.length > 0) {
                        var iSumFormr = 0.000;
                        aFormr.forEach(x => {
                            iSumFormr += parseFloat(x.Formr);
                        })

                        item.Balance = item.Netavailqty - iSumFormr;

                        var oFormr = aFormr.filter(x => x.Transno == sTransNo && x.Transitm == sTransItm);
                        item.Formr = (oFormr.length > 0 ? oFormr[0].Formr : 0.000);
                    }
                })
                
                var oJSONModel = new sap.ui.model.json.JSONModel();
                oJSONModel.setData(aMrpDtl);
                this.getView().setModel(oJSONModel, "mrpDtl");
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

            onReserveMrpHdr() {
                var oTable = this.byId("mrpHdrTab");
                var aSelIdx = oTable.getSelectedIndices();
                var aData = [];
                
                aSelIdx.forEach(item => {
                    var sPath = (oTable.getContextByIndex(item)).sPath;
                    var oRowData = this.getView().getModel("mrpHdr").getProperty(sPath);
                    if (aData.filter(x => x.Plantcd == oRowData.Plantcd && x.Matno == oRowData.Matno).length == 0) {
                        aData.push(oRowData);
                    }

                    this.getView().getModel("mrpHdr").setProperty(sPath + "/Reserved", true);
                });

                if (aData.length > 0) {
                    // Filter MRP Header
                    var aDataMrpHdr = this.getView().getModel("mrpHdr").getData().results.filter(item => item.Reserved === true);
                    this.getView().getModel("mrpHdr").setProperty("/results", aDataMrpHdr);
                    oTable.clearSelection();

                    // Set first selected row as active
                    var sPlantCd = aDataMrpHdr[0].Plantcd;
                    var sMatNo = aDataMrpHdr[0].Matno;
                    var sTransNo = aDataMrpHdr[0].Transno;
                    var sTransItm = aDataMrpHdr[0].Transitm;

                    this.getView().getModel("ui").setProperty("/activePlantCd", sPlantCd);
                    this.getView().getModel("ui").setProperty("/activeMatNo", sMatNo);
                    this.getView().getModel("ui").setProperty("/activeTransNo", sTransNo);
                    this.getView().getModel("ui").setProperty("/activeTransItm", sTransItm);
                    this.getView().getModel("ui").setProperty("/activeHdrRowPath", '/results/0');

                    var oModel = this.getOwnerComponent().getModel();
                    var oEntitySet = "/MRPDetailViewSet";
                    var oJSONModel = new sap.ui.model.json.JSONModel();
    
                    _aReserveList = [];
                    _aForMrList = [];
                    aData.forEach((item, idx) => {
                        console.log("adata", item)
                        oModel.read(oEntitySet, {
                            urlParameters: {
                                "$filter": "Plantcd eq '" + item.Plantcd + "' and Matno eq '" + item.Matno + "'"
                            },
                            success: function (data, response) {
                                console.log("MRPDetailViewSet", data);
                                
                                _aReserveList.push(...data.results);

                                if (idx == aData.length - 1) {
                                    var aMrpDtl = {results:[]};
                                    var aReserveList = jQuery.extend(true, [], _aReserveList);

                                    aMrpDtl.results.push(...aReserveList.filter(x => x.Plantcd == sPlantCd && x.Matno == sMatNo));
                                    oJSONModel.setData(aMrpDtl);
                                    _this.getView().setModel(oJSONModel, "mrpDtl");
                                }
                            },
                            error: function (err) { 
                                console.log("error", err)
                            }
                        })
                    })
                } else {
                    MessageBox.warning("No selected data.");
                }
            },

            onResetMrpHdr() {
                MessageBox.confirm("Disregard changes?", {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction == "Yes") {
                            _this.getView().getModel("mrpDtl").setProperty("/results", []);
                            _this.onSearchMrpHdr();
                            _aReserveList = [];
                            _aForMrList = [];
                        }
                    }
                });
            },

            onExecuteMrpHdr() {
                var oTable = this.getView().byId("mrpHdrTab");
                var aSelIdx = oTable.getSelectedIndices();

                if (aSelIdx.length > 0) {
                    var aMrTab = [];
                    var aPrTab = [];

                    aSelIdx.forEach(selIdx => {
                        var sPath = oTable.getContextByIndex(selIdx).sPath;
                        var oMrpHdr = this.getView().getModel("mrpHdr").getProperty(sPath);

                        var aForMr = _aForMrList.filter(x => x.Transno == oMrpHdr.Transno && x.Transitm == oMrpHdr.Transitm);
                        if (aForMr.length > 0) {
                            aForMr.forEach(item => {
                                var oForMr = {
                                    "Bwart": (oMrpHdr.Mattype == item.Mattype ? "921" : "923"),
                                    "Issplant": item.Plantcd,
                                    "Isssloc": item.Sloc,
                                    "Issmatno": item.Matno,
                                    "Issbatch": item.Batch,
                                    "Reqdqty": item.Formr,
                                    "Issuom": oMrpHdr.Baseuom,
                                    "Rcvplant": oMrpHdr.Plantcd,
                                    "Rcvmatno": oMrpHdr.Matno,
                                    "Rcvbatch": item.Batch,
                                    "Rcvsloc": item.Sloc,
                                    "Createdby": _startUpInfo.id,
                                    "Transno": oMrpHdr.Transno,
                                    "Transitm": oMrpHdr.Transitm
                                };

                                aMrTab.push(oForMr);
                            })
                        }

                        var oForPr = {
                            "PurGroup": oMrpHdr.Purchgrp,
                            "ShortText": oMrpHdr.Gmcdescen.substr(0, 40),
                            "Material": oMrpHdr.Matno,
                            "Plant": oMrpHdr.Plantcd,
                            "MatGrp": oMrpHdr.Matgrp,
                            "Quantity": oMrpHdr.Forpr,
                            "Unit": oMrpHdr.Baseuom,
                            "Batch": oMrpHdr.Iono,
                            "FixedVend": oMrpHdr.Vendorcd,
                            "PurchOrg": oMrpHdr.Purchorg,
                            "ProcuringPlant": oMrpHdr.Plantcd,
                            "Currency": oMrpHdr.Currencycd,
                            "PoPrice": oMrpHdr.Unitprice,
                            "Salesgrp": oMrpHdr.Salesgrp,
                            "Custgrp": oMrpHdr.Custgrp,
                            "Shiptoplant": oMrpHdr.Plantcd,
                            "Materialtype": oMrpHdr.Mattype,
                            "Transno": oMrpHdr.Transno,
                            "Transitm": oMrpHdr.Transitm
                        }

                        aPrTab.push(oForPr);
                        
                    })

                    var oParam = {};
                    var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                    oParam["N_IOMrp_Imp_Mrtab"] = aMrTab;
                    oParam["N_IOMrp_Imp_Prtab"] = aPrTab;
                    oParam["N_IOMrp_Exp_Mrtab"] = [];
                    oParam["N_IOMrp_Exp_Prtab"] = [];
                    oParam["N_IOMrp_Exp_Retmsg"] = [];

                    console.log(oParam)
                    oModel.create("/EMrtabSet", oParam, {
                        method: "POST",
                        success: function(oResult, oResponse) {
                            console.log(oResult);
                        },
                        error: function(err) {
                            console.log("error", err);
                        }
                    });


                } else {
                    MessageBox.warning("No selected data.")
                }
            },

            setRowReadMode(arg) {
                var oTable = this.byId(arg + "Tab");
                oTable.getColumns().forEach((col, idx) => {     
                    if (col.getLabel().getText().includes("*")) {
                        col.getLabel().setText(col.getLabel().getText().replaceAll("*", ""));
                    }   

                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (ci.type === "Edm.String" || ci.type === "Edm.Decimal") {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + arg + ">" + ci.name + "}",
                                    maxLines: 1
                                }));
                            }
                            else if (ci.type === "Edm.Boolean") {
                                col.setTemplate(new sap.m.CheckBox({selected: "{" + arg + ">" + ci.name + "}", editable: false}));
                            }

                            if (ci.required) {
                                col.getLabel().removeStyleClass("requiredField");
                            }
                        })
                })
            },

            onEditMrpDtl() {
                var oTable = this.getView().byId("mrpDtlTab");
                
                if (oTable.getRows().length > 0) {
                    this.byId("btnEditMrpDtl").setVisible(false);
                    this.byId("btnSaveMrpDtl").setVisible(true);
                    this.byId("btnCancelMrpDtl").setVisible(true);
                    this.byId("btnRefreshMrpDtl").setVisible(false);

                    // Disable header
                    this.byId("mrpHdrTab").setShowOverlay(true);

                    this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("mrpDtl").getData());

                    this.getView().getModel("mrpDtl").getData().results.forEach(item => item.Formr = null);
                    this.setRowEditMode("mrpDtl");
                } else {
                    MessageBox.warning("No data to edit.");
                }
            },

            setRowEditMode(arg) {
                this.getView().getModel(arg).getData().results.forEach(item => item.Edited = false);
                
                var oTable = this.byId(arg + "Tab");
                oTable.getColumns().forEach((col, idx) => {
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (!ci.hideOnChange && ci.updatable) {
                                if (ci.type === "Edm.Decimal" || ci.type === "Edm.Double" || ci.type === "Edm.Float" || ci.type === "Edm.Int16" || ci.type === "Edm.Int32" || ci.type === "Edm.Int64" || ci.type === "Edm.SByte" || ci.type === "Edm.Single") {
                                    col.setTemplate(new sap.m.Input({
                                        type: sap.m.InputType.Number,
                                        value: "{" + arg + ">" + ci.name + "}",
                                        liveChange: this.onNumberLiveChange
                                        // change: this.onInputChange.bind(this)
                                    }));
                                }
                                else {
                                    if (ci.maxLength !== null) {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{" + arg + ">" + ci.name + "}",
                                            maxLength: +ci.maxLength,
                                            change: this.onInputTextChange.bind(this)
                                            //liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{" + arg + ">" + ci.name + "}",
                                            change: this.onInputTextChange.bind(this)
                                            //liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }
                            }
                        })
                })
            },

            onInputTextChange: function(oEvent) {
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;

                this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);
            },

            onNumberLiveChange: function(oEvent) {
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;

                _this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);

                var oModel = _this.getView().getModel(sModel).getProperty(sRowPath);
                var iNewValue = parseInt(oEvent.getParameters().newValue);

                var aRow = _this.getView().getModel(sModel).getProperty(sRowPath);
                var aFormr = _aForMrList.filter(x => x.Plantcd == aRow.Plantcd && 
                    x.Matno == aRow.Matno && x.Sloc == aRow.Sloc && x.Batch == aRow.Batch);

                var iSumFormr = 0.000;
                if (aFormr.length) {
                    aFormr.forEach(item => {
                        iSumFormr += item.Formr;
                    })
                }

                var iBalance = oModel.Netavailqty - iSumFormr - (iNewValue ? iNewValue : 0);
                _this.getView().getModel(sModel).setProperty(sRowPath + "/Balance", iBalance);
            },

            onSaveMrpDtl() {
                if (this._aInvalidValueState.length > 0) {
                    MessageBox.error("Invalid data. Saving failed.");
                    return;
                }

                var aEditedRows = this.getView().getModel("mrpDtl").getData().results.filter(item => item.Edited === true);
                console.log("aEditedRows", aEditedRows);

                // Validation
                var sInvalidMsg = "";
                if (aEditedRows.filter(x => x.Formr < 0).length > 0) {
                    MessageBox.error("For MR should not be negative.");
                    return;
                }

                if (aEditedRows.filter(x => x.Formr != 0).length == 0) {
                    MessageBox.warning("No data modified.");
                    return;
                }

                if (aEditedRows.length > 0) {
                    var sTransNo = this.getView().getModel("ui").getProperty("/activeTransNo");
                    var sTransItm = this.getView().getModel("ui").getProperty("/activeTransItm");

                    aEditedRows.forEach(item => {
                        if (_aForMrList.filter(x => x.Transno == sTransNo && x.Transitm == sTransItm && x.Plantcd == item.Plantcd && 
                            x.Matno == item.Matno && x.Sloc == item.Sloc && x.Batch == item.Batch).length > 0) {

                            var iIdx = _aForMrList.findIndex(x => x.Transno == sTransNo && x.Transitm == sTransItm && 
                                x.Plantcd == item.Plantcd && x.Matno == item.Matno && x.Sloc == item.Sloc && x.Batch == item.Batch);
                            
                            _aForMrList[iIdx].Formr = item.Formr;
                        } else {
                            var oForMr = {
                                Transno: sTransNo,
                                Transitm: sTransItm,
                                Plantcd: item.Plantcd,
                                Matno: item.Matno,
                                Sloc: item.Sloc,
                                Batch: item.Batch,
                                Mattype: item.Mattype,
                                Formr: item.Formr
                            }

                            _aForMrList.push(oForMr);
                        }
                    })
                    console.log("save", _aForMrList)

                    // Update Mrp Header column For Mr
                    var sRowPath = this.getView().getModel("ui").getProperty("/activeHdrRowPath");
                    var dSumFormr = 0.0;

                    _aForMrList.forEach(item => {
                        if (item.Transno == sTransNo && item.Transitm == sTransItm) {
                            dSumFormr += parseFloat(item.Formr);
                        }
                    })

                    this.getView().getModel("mrpHdr").setProperty(sRowPath + "/Formr", dSumFormr);

                    // Update Mrp Header column For Pr
                    var oMrpHdr = this.getView().getModel("mrpHdr").getProperty(sRowPath);
                    var dBalance = parseFloat(oMrpHdr.Balance - dSumFormr);
                    
                    this.getView().getModel("mrpHdr").setProperty(sRowPath + "/Forpr", dBalance);

                    this.byId("btnEditMrpDtl").setVisible(true);
                    this.byId("btnSaveMrpDtl").setVisible(false);
                    this.byId("btnCancelMrpDtl").setVisible(false);
                    this.byId("btnRefreshMrpDtl").setVisible(true);
                    this.setRowReadMode("mrpDtl");
                    this.byId("mrpHdrTab").setShowOverlay(false);

                }  
            },

            onCancelMrpDtl() {
                MessageBox.confirm("Disregard changes?", {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction == "Yes") {
                            _this.byId("btnEditMrpDtl").setVisible(true);
                            _this.byId("btnSaveMrpDtl").setVisible(false);
                            _this.byId("btnCancelMrpDtl").setVisible(false);
                            _this.byId("btnRefreshMrpDtl").setVisible(true);

                            // Disable header
                            _this.byId("mrpHdrTab").setShowOverlay(false);
                                        
                            _this.setRowReadMode("mrpDtl");
                            _this.getView().getModel("mrpDtl").setProperty("/", _this._oDataBeforeChange);
                            _this._aInvalidValueState = [];
                            
                        }
                    }
                });
            },

            onRefreshMrpDtl() {
                //this.onReserveMrpHdr()();
            },
            
            onColumnProp: function(oEvent) {
                var aColumns = [];
                var oTable = oEvent.getSource().oParent.oParent;
                
                oTable.getColumns().forEach(col => {
                    aColumns.push({
                        name: col.getProperty("sortProperty"), 
                        label: col.getLabel().getText(),
                        position: col.getIndex(), 
                        selected: col.getProperty("visible")
                    });
                })
                
                var oDialog = this._oViewSettingsDialog["zuimrp.view.ColumnDialog"];
                oDialog.getModel().setProperty("/table", oTable.getBindingInfo("rows").model);
                oDialog.getModel().setProperty("/items", aColumns);
                oDialog.getModel().setProperty("/rowCount", aColumns.length);
                oDialog.open();
            },

            beforeOpenColProp: function(oEvent) {
                oEvent.getSource().getModel().getData().items.forEach(item => {
                    if (item.selected) {
                        oEvent.getSource().getContent()[0].addSelectionInterval(item.position, item.position);
                    }
                    else {
                        oEvent.getSource().getContent()[0].removeSelectionInterval(item.position, item.position);
                    }
                })
            },            

            onColumnPropConfirm: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuimrp.view.ColumnDialog"];
                var oDialogTable = oDialog.getContent()[0];
                var aSelRows = oDialogTable.getSelectedIndices();

                if (aSelRows.length === 0) {
                    MessageBox.information("Please select at least one visible column.");
                }
                else {
                    oDialog.close();
                    var sTable = oDialog.getModel().getData().table;
                    var oTable = this.byId(sTable + "Tab");
                    var oColumns = oTable.getColumns();

                    oColumns.forEach(col => {
                        if (aSelRows.filter(item => item === col.getIndex()).length === 0) {
                            col.setVisible(false);
                        }
                        else col.setVisible(true);
                    })
                }
            },

            onColumnPropCancel: function(oEvent) {
                this._oViewSettingsDialog["zuimrp.view.ColumnDialog"].close();
            },
        });
    });
