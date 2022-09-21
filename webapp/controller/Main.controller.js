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
        var _oCaption = {};

        // shortcut for sap.ui.table.SortOrder
        var SortOrder = library.SortOrder;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });

        return Controller.extend("zuimrp.controller.Main", {
            onInit: function () {
                _this = this;
                this.showLoadingDialog('Loading...');

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
                
                this._oDataBeforeChange = {};
                this._aInvalidValueState = [];
            },

            initializeComponent() {
                // Get Captions
                this.getCaption();

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

                // Disable all buttons
                this.byId("btnReserveMrpHdr").setEnabled(false);
                this.byId("btnResetMrpHdr").setEnabled(false);
                this.byId("btnExecuteMrpHdr").setEnabled(false);
                this.byId("btnColPropMrpHdr").setEnabled(false);
                this.byId("btnTabLayoutMrpHdr").setEnabled(false);
                this.byId("btnEditMrpDtl").setEnabled(false);
                this.byId("btnRefreshMrpDtl").setEnabled(false);
                this.byId("btnColPropMrpDtl").setEnabled(false);
                this.byId("btnTabLayoutMrpDtl").setEnabled(false);
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
                            // Temporary set default sbu to VER
                            var sbu = "VER";
                            //var sbu = data.results[0].Sbu;
                            
                            if (sbu.toUpperCase() == "VER") {
                                _this.getView().byId("filterPlant").setFilterType("single");
                                //console.log("single", _this.getView().byId("filterPlant").getFilterType())
                            }

                            var oJSONModel = new JSONModel();
                            oJSONModel.setData({activeSbu: sbu});
                            _this.getView().setModel(oJSONModel, "ui");

                            _this.getColumns();   
                            _this.closeLoadingDialog();                         
                        }
                    },
                    error: function (err) { 
                        _this.closeLoadingDialog();
                    }
                })
            },

            onSearchMrpHdr(oEvent) {
                this.showLoadingDialog("Loading...");

                var aFilters = this.getView().byId("sfbMRP").getFilters();
                var sFilterGlobal = "";
                if (oEvent) sFilterGlobal = oEvent.getSource()._oBasicSearchField.mProperties.value;
                
                this.getMrpHdr(aFilters, sFilterGlobal);

                this.byId("btnReserveMrpHdr").setEnabled(true);
                this.byId("btnResetMrpHdr").setEnabled(true);
                this.byId("btnExecuteMrpHdr").setEnabled(true);
                this.byId("btnColPropMrpHdr").setEnabled(true);
                this.byId("btnTabLayoutMrpHdr").setEnabled(true);
                this.byId("btnEditMrpDtl").setEnabled(true);
                this.byId("btnRefreshMrpDtl").setEnabled(true);
                this.byId("btnColPropMrpDtl").setEnabled(true);
                this.byId("btnTabLayoutMrpDtl").setEnabled(true);
            },

            getMrpHdr(pFilters, pFilterGlobal) {
                var oModel = this.getOwnerComponent().getModel();
                oModel.read('/MRPHeaderViewSet', {
                    success: function (data, response) {
                        //console.log("MRPHeaderViewSet", data)
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
                            activeTransNo: data.results[0].TRANSNO,
                            activeTransItm: data.results[0].TRANSITM,
                            activePlantCd: data.results[0].PLANTCD,
                            activeMatNo: data.results[0].MATNO,
                            activeHdrRowPath: "/results/0"
                        }), "ui");

                        _this.setRowReadMode("mrpHdr");
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log("error", err)
                        _this.closeLoadingDialog();
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

            getColumns: async function() {
                var oModelColumns = new JSONModel();
                var sPath = jQuery.sap.getModulePath("zuimrp", "/model/columns.json")
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();
                var oModel = this.getOwnerComponent().getModel();

                oModel.metadataLoaded().then(() => {
                    this.getDynamicColumns(oColumns, "MRPMOD", "ZDV_3DERP_MRPHDR");
                    
                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, "MRPDTLMOD", "ZDV_MRPDTL");
                    }, 100);
                })
            },

            getDynamicColumns(arg1, arg2, arg3) {
                var oColumns = arg1;
                var modCode = arg2;
                var tabName = arg3;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new JSONModel();
                // this.oJSONModel = new JSONModel();
                var vSBU = this.getView().getModel("ui").getData().activeSbu;

                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                // console.log(oModel)
                oModel.setHeaders({
                    sbu: vSBU,
                    type: modCode,
                    tabname: tabName
                });
                
                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);
                        // _this.getView().setModel(oJSONColumnsModel, "columns"); //set the view model

                        if (oData.results.length > 0) {
                            // console.log(modCode)
                            if (modCode === 'MRPMOD') {
                                // console.log(oData.results)
                                var aColumns = _this.setTableColumns(oColumns["mrpHdr"], oData.results);                               
                                // console.log(aColumns);
                                _this._aColumns["mrpHdr"] = aColumns["columns"];
                                _this._aSortableColumns["mrpHdr"] = aColumns["sortableColumns"];
                                _this._aFilterableColumns["mrpHdr"] = aColumns["filterableColumns"]; 
                                _this.addColumns(_this.byId("mrpHdrTab"), aColumns["columns"], "mrpHdr");
                            }
                            else if (modCode === 'MRPDTLMOD') {
                                var aColumns = _this.setTableColumns(oColumns["mrpDtl"], oData.results);
                                // console.log("aColumns", aColumns);
                                _this._aColumns["mrpDtl"] = aColumns["columns"];
                                _this._aSortableColumns["mrpDtl"] = aColumns["sortableColumns"];
                                _this._aFilterableColumns["mrpDtl"] = aColumns["filterableColumns"];
                                _this.addColumns(_this.byId("mrpDtlTab"), aColumns["columns"], "mrpDtl");
                            }
                        }
                    },
                    error: function (err) {
                        _this.closeLoadingDialog(that);
                    }
                });
            },

            setTableColumns: function(arg1, arg2) {
                var oColumn = arg1;
                var oMetadata = arg2;
                
                var aSortableColumns = [];
                var aFilterableColumns = [];
                var aColumns = [];

                oMetadata.forEach((prop, idx) => {
                    var vCreatable = prop.Editable;
                    var vUpdatable = prop.Editable;
                    var vSortable = true;
                    var vSorted = prop.Sorted;
                    var vSortOrder = prop.SortOrder;
                    var vFilterable = true;
                    var vName = prop.ColumnLabel;
                    var oColumnLocalProp = oColumn.filter(col => col.name.toUpperCase() === prop.ColumnName);
                    var vShowable = true;
                    var vOrder = prop.Order;

                    // console.log(prop)
                    if (vShowable) {
                        //sortable
                        if (vSortable) {
                            aSortableColumns.push({
                                name: prop.ColumnName, 
                                label: vName, 
                                position: +vOrder, 
                                sorted: vSorted,
                                sortOrder: vSortOrder
                            });
                        }

                        //filterable
                        if (vFilterable) {
                            aFilterableColumns.push({
                                name: prop.ColumnName, 
                                label: vName, 
                                position: +vOrder,
                                value: "",
                                connector: "Contains"
                            });
                        }
                    }

                    //columns
                    aColumns.push({
                        name: prop.ColumnName, 
                        label: vName, 
                        position: +vOrder,
                        type: prop.DataType,
                        creatable: vCreatable,
                        updatable: vUpdatable,
                        sortable: vSortable,
                        filterable: vFilterable,
                        visible: prop.Visible,
                        required: prop.Mandatory,
                        width: prop.ColumnWidth + 'px',
                        sortIndicator: vSortOrder === '' ? "None" : vSortOrder,
                        hideOnChange: false,
                        valueHelp: oColumnLocalProp.length === 0 ? {"show": false} : oColumnLocalProp[0].valueHelp,
                        showable: vShowable,
                        key: prop.Key === '' ? false : true,
                        maxLength: prop.Length,
                        precision: prop.Decimal,
                        scale: prop.Scale !== undefined ? prop.Scale : null
                    })
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

            addColumns(table, columns, model) {
                var aColumns = columns.filter(item => item.showable === true)
                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));

                aColumns.forEach(col => {
                    // console.log(col)
                    if (col.type === "STRING" || col.type === "DATETIME") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            // id: col.name,
                            width: col.width,
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"}),
                            visible: col.visible
                        }));
                    }
                    else if (col.type === "NUMBER") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "End",
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"}),
                            visible: col.visible
                        }));
                    }
                    else if (col.type === "BOOLEAN" ) {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "Center",
                            sortProperty: col.name,
                            filterProperty: col.name,                            
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.CheckBox({selected: "{" + model + ">" + col.name + "}", editable: false}),
                            visible: col.visible
                        }));
                    }
                })
            },

            onCellClickMrpHr: function(oEvent) {
                var sPlantCd = oEvent.getParameters().rowBindingContext.getObject().PLANTCD;
                var sMatNo = oEvent.getParameters().rowBindingContext.getObject().MATNO;
                var sTransNo = oEvent.getParameters().rowBindingContext.getObject().TRANSNO;
                var sTransItm = oEvent.getParameters().rowBindingContext.getObject().TRANSITM;

                this.getView().getModel("ui").setProperty("/activePlantCd", sPlantCd);
                this.getView().getModel("ui").setProperty("/activeMatNo", sMatNo);
                this.getView().getModel("ui").setProperty("/activeTransNo", sTransNo);
                this.getView().getModel("ui").setProperty("/activeTransItm", sTransItm);
                this.getView().getModel("ui").setProperty("/activeHdrRowPath", oEvent.getParameters().rowBindingContext.sPath);

                var aMrpDtl = {results: []};
                var aReserveList = jQuery.extend(true, [], _aReserveList);

                aMrpDtl.results.push(...aReserveList.filter(x => x.PLANTCD == sPlantCd && x.MATNO == sMatNo));
                aMrpDtl.results.forEach(item => {
                    var aFormr = _aForMrList.filter(x => x.PLANTCD == item.PLANTCD && x.MATNO == item.MATNO && 
                        x.SLOC == item.SLOC && x.BATCH == item.BATCH);
                    if (aFormr && aFormr.length > 0) {
                        var iSumFormr = 0.000;
                        aFormr.forEach(x => {
                            iSumFormr += parseFloat(x.Formr);
                        })

                        item.BALANCE = item.NETAVAILQTY - iSumFormr;

                        var oFormr = aFormr.filter(x => x.TRANSNO == sTransNo && x.TRANSITM == sTransItm);
                        item.FORMR = (oFormr.length > 0 ? oFormr[0].FORMR : 0.000);
                    }
                })
                
                var oJSONModel = new sap.ui.model.json.JSONModel();
                oJSONModel.setData(aMrpDtl);
                this.getView().setModel(oJSONModel, "mrpDtl");
            },

            createViewSettingsDialog: function (arg1, arg2) {
                var sDialogFragmentName = null;

                if (arg1 === "sort") sDialogFragmentName = "zuimrp.view.fragments.SortDialog";
                else if (arg1 === "filter") sDialogFragmentName = "zuimrp.view.fragments.FilterDialog";
                else if (arg1 === "column") sDialogFragmentName = "zuimrp.view.fragments.ColumnDialog";

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
                this.showLoadingDialog("Loading...");

                var oTable = this.byId("mrpHdrTab");
                var aSelIdx = oTable.getSelectedIndices();
                var aData = [];
                
                aSelIdx.forEach(item => {
                    var sPath = (oTable.getContextByIndex(item)).sPath;
                    var oRowData = this.getView().getModel("mrpHdr").getProperty(sPath);
                    if (aData.filter(x => x.PLANTCD == oRowData.PLANTCD && x.MATNO == oRowData.MATNO).length == 0) {
                        aData.push(oRowData);
                    }

                    this.getView().getModel("mrpHdr").setProperty(sPath + "/RESERVED", true);
                });

                if (aData.length > 0) {
                    // Filter MRP Header
                    var aDataMrpHdr = this.getView().getModel("mrpHdr").getData().results.filter(item => item.RESERVED === true);
                    // this.getView().getModel("mrpHdr").setProperty("/results", aDataMrpHdr);
                    // oTable.clearSelection();

                    // Set first selected row as active
                    var sPlantCd = aDataMrpHdr[0].PLANTCD;
                    var sMatNo = aDataMrpHdr[0].MATNO;
                    var sTransNo = aDataMrpHdr[0].TRANSNO;
                    var sTransItm = aDataMrpHdr[0].TRANSITM;

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
                        //console.log("adata", item)
                        oModel.read(oEntitySet, {
                            urlParameters: {
                                "$filter": "PLANTCD eq '" + item.PLANTCD + "' and MATNO eq '" + item.MATNO + "'"
                            },
                            success: function (data, response) {
                                //console.log("MRPDetailViewSet", data);
                                
                                _aReserveList.push(...data.results);

                                if (idx == aData.length - 1) {
                                    var aMrpDtl = {results:[]};
                                    var aReserveList = jQuery.extend(true, [], _aReserveList);

                                    aMrpDtl.results.push(...aReserveList.filter(x => x.PLANTCD == sPlantCd && x.MATNO == sMatNo));
                                    oJSONModel.setData(aMrpDtl);
                                    _this.getView().setModel(oJSONModel, "mrpDtl");
                                }

                                _this.closeLoadingDialog();
                            },
                            error: function (err) { 
                                console.log("error", err)
                                _this.closeLoadingDialog();
                            }
                        })
                    })
                } else {
                    MessageBox.information(_oCaption.INFO_NO_SELECTED);
                    _this.closeLoadingDialog();
                }
            },

            onResetMrpHdr() {
                if (_this.getView().getModel("mrpDtl")) {
                    MessageBox.confirm(_oCaption.CONFIRM_DISREGARD_CHANGE, {
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
                } else {
                    MessageBox.information(_oCaption.INFO_NO_DATA_RESET);
                }
            },

            onExecuteMrpHdr() {
                this.showLoadingDialog("Loading...");

                var oTable = this.getView().byId("mrpHdrTab");
                var aSelIdx = oTable.getSelectedIndices();

                if (aSelIdx.length > 0 && _aForMrList.length > 0) {
                    var aMrTab = [];
                    var aPrTab = [];

                    aSelIdx.forEach(selIdx => {
                        var sPath = oTable.getContextByIndex(selIdx).sPath;
                        var oMrpHdr = this.getView().getModel("mrpHdr").getProperty(sPath);

                        var aForMr = _aForMrList.filter(x => x.Transno == oMrpHdr.Transno && x.Transitm == oMrpHdr.Transitm);
                        if (aForMr.length > 0) {
                            aForMr.forEach(item => {
                                var oForMr = {
                                    "Bwart": (oMrpHdr.MATTYPE == item.MATTYPE ? "921" : "923"),
                                    "Issplant": item.PLANTCD,
                                    "Isssloc": item.SLOC,
                                    "Issmatno": item.MATNO,
                                    "Issbatch": item.BATCH,
                                    "Reqdqty": item.FORMR,
                                    "Issuom": oMrpHdr.BASEUOM,
                                    "Rcvplant": oMrpHdr.PLANTCD,
                                    "Rcvmatno": oMrpHdr.MATNO,
                                    "Rcvbatch": item.BATCH,
                                    "Rcvsloc": item.SLOC,
                                    "Createdby": _startUpInfo.id,
                                    "Transno": oMrpHdr.TRANSNO,
                                    "Transitm": oMrpHdr.TRANSITM
                                };

                                aMrTab.push(oForMr);
                            })
                        }

                        var oForPr = {
                            "PurGroup": oMrpHdr.PURCHGRP,
                            "ShortText": oMrpHdr.GMCDESCEN.substr(0, 40),
                            "Material": oMrpHdr.MATNO,
                            "Plant": oMrpHdr.PLANTCD,
                            "MatGrp": oMrpHdr.MATGRP,
                            "Quantity": oMrpHdr.FORPR,
                            "Unit": oMrpHdr.BASEUOM,
                            "Batch": oMrpHdr.IONO,
                            "FixedVend": oMrpHdr.VENDORCD,
                            "PurchOrg": oMrpHdr.PURCHORG,
                            "ProcuringPlant": oMrpHdr.PLANTCD,
                            "Currency": oMrpHdr.CURRENCYCD,
                            "PoPrice": oMrpHdr.UNITPRICE,
                            "Salesgrp": oMrpHdr.SALESGRP,
                            "Custgrp": oMrpHdr.CUSTGRP,
                            "Shiptoplant": oMrpHdr.PLANTCD,
                            "Materialtype": oMrpHdr.MATTYPE,
                            "Transno": oMrpHdr.TRANSNO,
                            "Transitm": oMrpHdr.TRANSITM
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

                    _this.closeLoadingDialog();
                } else if (_aForMrList.length == 0) {
                    MessageBox.warning(_oCaption.INFO_NO_DATA_EXEC);
                    _this.closeLoadingDialog();
                } else {
                    MessageBox.warning(_oCaption.INFO_NO_SELECTED);
                    _this.closeLoadingDialog();
                }
            },

            setRowReadMode(arg) {
                var oTable = this.byId(arg + "Tab");
                oTable.getColumns().forEach((col, idx) => {                    
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (ci.type === "STRING" || ci.type === "NUMBER") {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + arg + ">" + ci.name + "}",
                                    maxLines: 1
                                }));
                            }
                            else if (ci.type === "BOOLEAN") {
                                col.setTemplate(new sap.m.CheckBox({selected: "{" + arg + ">" + ci.name + "}", editable: false}));
                            }

                            if (ci.required) {
                                col.getLabel().removeStyleClass("requiredField");
                            }
                        })
                })
            },

            setReqColHdrColor(arg) {
                var oTable = this.byId(arg + "Tab");

                oTable.getColumns().forEach((col, idx) => {
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (ci.required) {
                                col.getLabel().removeStyleClass("requiredField");
                            }
                        })
                })
            },

            resetVisibleCols(arg) {
                var aData = this.getView().getModel(arg).getData().results;

                this._oDataBeforeChange.results.forEach((item, idx) => {
                    if (item.Deleted) {
                        aData.splice(idx, 0, item)
                    }
                })

                this.getView().getModel(arg).setProperty("/results", aData);
            },

            onEditMrpDtl() {
                var oTable = this.getView().byId("mrpDtlTab");
                
                if (oTable.getRows().length > 0) {
                    this.byId("btnEditMrpDtl").setVisible(false);
                    this.byId("btnSaveMrpDtl").setVisible(true);
                    this.byId("btnCancelMrpDtl").setVisible(true);
                    this.byId("btnRefreshMrpDtl").setVisible(false);
                    this.byId("btnColPropMrpDtl").setVisible(false);
                    this.byId("btnTabLayoutMrpDtl").setVisible(false);

                    // Disable header
                    this.byId("mrpHdrTab").setShowOverlay(true);

                    this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("mrpDtl").getData());

                    this.getView().getModel("mrpDtl").getData().results.forEach(item => item.FORMR = null);
                    this.setRowEditMode("mrpDtl");
                } else {
                    MessageBox.warning(_oCaption.INFO_NO_DATA_EDIT);
                }
            },

            setRowEditMode(arg) {
                this.getView().getModel(arg).getData().results.forEach(item => item.Edited = false);

                var oTable = this.byId(arg + "Tab");

                oTable.getColumns().forEach((col, idx) => {
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (!ci.hideOnChange && ci.updatable) {
                                if (ci.type === "BOOLEAN") {
                                    col.setTemplate(new sap.m.CheckBox({selected: "{" + arg + ">" + ci.name + "}", editable: true}));
                                }
                                else if (ci.valueHelp["show"]) {
                                    col.setTemplate(new sap.m.Input({
                                        // id: "ipt" + ci.name,
                                        type: "Text",
                                        value: "{" + arg + ">" + ci.name + "}",
                                        maxLength: +ci.maxLength,
                                        showValueHelp: true,
                                        valueHelpRequest: this.handleValueHelp.bind(this),
                                        showSuggestion: true,
                                        maxSuggestionWidth: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].maxSuggestionWidth : "1px",
                                        suggestionItems: {
                                            path: ci.valueHelp["items"].path, //ci.valueHelp.model + ">/items", //ci.valueHelp["suggestionItems"].path,
                                            length: 1000,
                                            template: new sap.ui.core.ListItem({
                                                key: "{" + ci.valueHelp["items"].value + "}", //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}",
                                                text: "{" + ci.valueHelp["items"].value + "}", //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}", //ci.valueHelp["suggestionItems"].text
                                                additionalText: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].additionalText : '',
                                            }),
                                            templateShareable: false
                                        },
                                        change: this.onValueHelpLiveInputChange.bind(this)
                                    }));
                                }
                                else if (ci.type === "NUMBER") {
                                    col.setTemplate(new sap.m.Input({
                                        type: sap.m.InputType.Number,
                                        textAlign: sap.ui.core.TextAlign.Right,
                                        value: "{path:'" + arg + ">" + ci.name + "', type:'sap.ui.model.odata.type.Decimal', formatOptions:{ minFractionDigits:" + ci.scale + ", maxFractionDigits:" + ci.scale + " }, constraints:{ precision:" + ci.precision + ", scale:" + ci.scale + " }}",
                                        liveChange: this.onNumberLiveChange.bind(this)
                                    }));
                                }
                                else {
                                    if (ci.maxLength !== null) {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{" + arg + ">" + ci.name + "}",
                                            maxLength: +ci.maxLength,
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{" + arg + ">" + ci.name + "}",
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }                                
                            }

                            if (ci.required) {
                                col.getLabel().addStyleClass("requiredField");
                            }
                        })
                })
            },

            onInputLiveTextChange: function(oEvent) {
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;

                this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);
            },

            onNumberLiveChange: function(oEvent) {
                // console.log(oEvent.getParameters())
                // console.log(oEvent.getParameters().value.split("."))
                // console.log(this.validationErrors)
                if (this.validationErrors === undefined) this.validationErrors = [];

                if (oEvent.getParameters().value.split(".").length > 1) {
                    if (oEvent.getParameters().value.split(".")[1].length > 3) {
                        // console.log("invalid");
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Enter a number with a maximum of 3 decimal places.");
                        this.validationErrors.push(oEvent.getSource().getId());
                    }
                    else {
                        oEvent.getSource().setValueState("None");
                        this.validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this.validationErrors.splice(index, 1)
                            }
                        })
                    }
                }
                else {
                    oEvent.getSource().setValueState("None");
                    this.validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this.validationErrors.splice(index, 1)
                        }
                    })
                }

                _this.onForPrChange(oEvent);
            },

            onForPrChange: function(oEvent) {
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;

                _this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);

                var oModel = _this.getView().getModel(sModel).getProperty(sRowPath);
                var iNewValue = parseInt(oEvent.getParameters().newValue);

                var aRow = _this.getView().getModel(sModel).getProperty(sRowPath);
                var aFormr = _aForMrList.filter(x => x.PLANTCD == aRow.PLANTCD && 
                    x.MATNO == aRow.MATNO && x.SLOC == aRow.SLOC && x.BATCH == aRow.BATCH);

                var iSumFormr = 0.000;
                if (aFormr.length) {
                    aFormr.forEach(item => {
                        iSumFormr += item.FORMR;
                    })
                }

                var iBalance = oModel.NETAVAILQTY - iSumFormr - (iNewValue ? iNewValue : 0);
                _this.getView().getModel(sModel).setProperty(sRowPath + "/BALANCE", iBalance);
            },

            onSaveMrpDtl() {
                if (this._aInvalidValueState.length > 0) {
                    MessageBox.error(_oCaption.INFO_INVALID_SAVE);
                    return;
                }

                var aEditedRows = this.getView().getModel("mrpDtl").getData().results.filter(item => item.Edited === true);
                //console.log("aEditedRows", aEditedRows);

                // Validation
                var sInvalidMsg = "";
                if (aEditedRows.filter(x => x.FORMR < 0).length > 0) {
                    MessageBox.warning(_oCaption.WARN_MR_NOT_NEGATIVE);
                    return;
                }

                if (aEditedRows.filter(x => x.FORMR != 0).length == 0) {
                    MessageBox.warning(_oCaption.WARN_NO_DATA_MODIFIED);
                    return;
                }

                if (aEditedRows.length > 0) {
                    var sTransNo = this.getView().getModel("ui").getProperty("/activeTransNo");
                    var sTransItm = this.getView().getModel("ui").getProperty("/activeTransItm");

                    aEditedRows.forEach(item => {
                        if (_aForMrList.filter(x => x.TRANSNO == sTransNo && x.TRANSITM == sTransItm && x.PLANTCD == item.PLANTCD && 
                            x.MATNO == item.MATNO && x.SLOC == item.SLOC && x.BATCH == item.BATCH).length > 0) {

                            var iIdx = _aForMrList.findIndex(x => x.TRANSNO == sTransNo && x.TRANSITM == sTransItm && 
                                x.PLANTCD == item.PLANTCD && x.MATNO == item.MATNO && x.SLOC == item.SLOC && x.BATCH == item.BATCH);
                            
                            _aForMrList[iIdx].FORMR = item.FORMR;
                        } else {
                            var oForMr = {
                                TRANSNO: sTransNo,
                                TRANSITM: sTransItm,
                                PLANTCD: item.PLANTCD,
                                MATNO: item.MATNO,
                                SLOC: item.SLOC,
                                BATCH: item.BATCH,
                                MATTYPE: item.MATTYPE,
                                FORMR: item.FORMR
                            }

                            _aForMrList.push(oForMr);
                        }
                    })

                    // Update Mrp Header column For Mr
                    var sRowPath = this.getView().getModel("ui").getProperty("/activeHdrRowPath");
                    var dSumFormr = 0.0;

                    _aForMrList.forEach(item => {
                        if (item.TRANSNO == sTransNo && item.TRANSITM == sTransItm) {
                            dSumFormr += parseFloat(item.FORMR);
                        }
                    })

                    this.getView().getModel("mrpHdr").setProperty(sRowPath + "/FORMR", dSumFormr);

                    // Update Mrp Header column For Pr
                    var oMrpHdr = this.getView().getModel("mrpHdr").getProperty(sRowPath);
                    var dBalance = parseFloat(oMrpHdr.BALANCE - dSumFormr);
                    
                    this.getView().getModel("mrpHdr").setProperty(sRowPath + "/FORPR", dBalance);

                    this.byId("btnEditMrpDtl").setVisible(true);
                    this.byId("btnSaveMrpDtl").setVisible(false);
                    this.byId("btnCancelMrpDtl").setVisible(false);
                    this.byId("btnRefreshMrpDtl").setVisible(true);
                    this.byId("btnColPropMrpDtl").setVisible(true);
                    this.byId("btnTabLayoutMrpDtl").setVisible(true);
                    this.setRowReadMode("mrpDtl");
                    this.byId("mrpHdrTab").setShowOverlay(false);

                }  
            },

            onCancelMrpDtl() {
                MessageBox.confirm(_oCaption.CONFIRM_DISREGARD_CHANGE, {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction == "Yes") {
                            _this.byId("btnEditMrpDtl").setVisible(true);
                            _this.byId("btnSaveMrpDtl").setVisible(false);
                            _this.byId("btnCancelMrpDtl").setVisible(false);
                            _this.byId("btnRefreshMrpDtl").setVisible(true);
                            _this.byId("btnColPropMrpDtl").setVisible(true);
                            _this.byId("btnTabLayoutMrpDtl").setVisible(true);

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
                
                var oDialog = this._oViewSettingsDialog["zuimrp.view.fragments.ColumnDialog"];
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
                var oDialog = this._oViewSettingsDialog["zuimrp.view.fragments.ColumnDialog"];
                var oDialogTable = oDialog.getContent()[0];
                var aSelRows = oDialogTable.getSelectedIndices();

                if (aSelRows.length === 0) {
                    MessageBox.information(_oCaption.INFO_SEL_ONE_COL);
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
                this._oViewSettingsDialog["zuimrp.view.fragments.ColumnDialog"].close();
            },

            showLoadingDialog(arg) {
                if (!this._LoadingDialog) {
                    this._LoadingDialog = sap.ui.xmlfragment("zuimrp.view.fragments.LoadingDialog", this);
                    this.getView().addDependent(this._LoadingDialog);
                } 
                // jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                
                this._LoadingDialog.setTitle(arg);
                this._LoadingDialog.open();
            },

            closeLoadingDialog() {
                this._LoadingDialog.close();
            },

            onSaveTableLayout: function (oEvent) {
                //saving of the layout of table
                var me = this;
                var ctr = 1;
                var oTable = oEvent.getSource().oParent.oParent;
                // var oTable = this.getView().byId("mainTab");
                var oColumns = oTable.getColumns();
                var vSBU = this.getView().getModel("ui").getData().sbu;
                console.log(oColumns)

                // return;
                var oParam = {
                    "SBU": vSBU,
                    "TYPE": "",
                    "TABNAME": "",
                    "TableLayoutToItems": []
                };

                if (oTable.getBindingInfo("rows").model === "mrpHdr") {
                    oParam['TYPE'] = "MRPMOD";
                    oParam['TABNAME'] = "ZDV_3DERP_MRPHDR";
                }
                else if (oTable.getBindingInfo("rows").model === "mrpDtl") {
                    oParam['TYPE'] = "MRPDTLMOD";
                    oParam['TABNAME'] = "ZDV_MRPDTL";
                }
                console.log(oParam)
                //get information of columns, add to payload
                oColumns.forEach((column) => {
                    oParam.TableLayoutToItems.push({
                        // COLUMNNAME: column.sId,
                        COLUMNNAME: column.mProperties.sortProperty,
                        ORDER: ctr.toString(),
                        SORTED: column.mProperties.sorted,
                        SORTORDER: column.mProperties.sortOrder,
                        SORTSEQ: "1",
                        VISIBLE: column.mProperties.visible,
                        WIDTH: column.mProperties.width.replace('px','')
                    });

                    ctr++;
                });

                //call the layout save
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                oModel.create("/TableLayoutSet", oParam, {
                    method: "POST",
                    success: function(data, oResponse) {
                        sap.m.MessageBox.information(_oCaption.INFO_LAYOUT_SAVE);
                        //Common.showMessage(me._i18n.getText('t6'));
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                    }
                });                
            },

            getCaption() {
                var oJSONModel = new JSONModel();
                var oDDTextParam = [];
                var oDDTextResult = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                
                // Smart Filter
                oDDTextParam.push({CODE: "PLANTCD"});
                oDDTextParam.push({CODE: "PURCHGRP"});
                oDDTextParam.push({CODE: "IONO"});
                oDDTextParam.push({CODE: "MATTYPE"});
                oDDTextParam.push({CODE: "MATGRP"});
                oDDTextParam.push({CODE: "CUSTGRP"});

                // Button
                oDDTextParam.push({CODE: "RESERVE"});
                oDDTextParam.push({CODE: "RESET"});
                oDDTextParam.push({CODE: "EXECUTE"});
                oDDTextParam.push({CODE: "COLUMNS"});
                oDDTextParam.push({CODE: "SAVELAYOUT"});
                oDDTextParam.push({CODE: "EDIT"});
                oDDTextParam.push({CODE: "SAVE"});
                oDDTextParam.push({CODE: "CANCEL"});
                oDDTextParam.push({CODE: "REFRESH"});

                // MessageBox
                oDDTextParam.push({CODE: "INFO_NO_SELECTED"});
                oDDTextParam.push({CODE: "CONFIRM_DISREGARD_CHANGE"});
                oDDTextParam.push({CODE: "INFO_NO_DATA_RESET"});
                oDDTextParam.push({CODE: "INFO_NO_DATA_EDIT"});
                oDDTextParam.push({CODE: "INFO_INVALID_SAVE"});
                oDDTextParam.push({CODE: "WARN_MR_NOT_NEGATIVE"});
                oDDTextParam.push({CODE: "WARN_NO_DATA_MODIFIED"});
                oDDTextParam.push({CODE: "INFO_SEL_ONE_COL"});
                oDDTextParam.push({CODE: "INFO_LAYOUT_SAVE"});
                oDDTextParam.push({CODE: "INFO_NO_DATA_EXEC"});
                
                oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {
                        // console.log(oData.CaptionMsgItems.results)
                        oData.CaptionMsgItems.results.forEach(item => {
                            oDDTextResult[item.CODE] = item.TEXT;
                        })

                        oJSONModel.setData(oDDTextResult);
                        _this.getView().setModel(oJSONModel, "ddtext");

                        _oCaption = _this.getView().getModel("ddtext").getData();
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                    }
                });
            }
        });
    });
