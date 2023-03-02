sap.ui.define([
    "./BaseController",
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
    function (BaseController, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController, MessageToast, SearchField) {
        "use strict";

        var _this;
        var _startUpInfo;
        var _aReserveList = [];
        var _aForMrList = [];
        var _oCaption = {};

        return BaseController.extend("zuimrp.controller.Main", {
            onInit: function () {
                _this = this;

                _this.getCaption();

                _this.initializeComponent();
            },

            onExit() {
                console.log("onExit")
                _this.unlockMrp();
            },

            unlockMrp() {
                var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZGW_3DERP_MRP_SRV/");
                var oEntitySet = "/MRPUnlockSet";

                oModel.read(oEntitySet, {
                    success: function (data, response) {
                        // console.log("onExit", data);
                    },
                    error: function (err) { }
                })
            },

            initializeComponent() {
                this.getView().setModel(new JSONModel({
                    sbu: "VER", // temporary Sbu
                    rowCountMrpHdr: "0",
                    rowCountMrpDtl: "0"
                }), "ui");

                var oModelStartUp= new sap.ui.model.json.JSONModel();
                oModelStartUp.loadData("/sap/bc/ui2/start_up").then(() => {
                    _startUpInfo = oModelStartUp.oData;
                });

                this.onInitBase(_this, _this.getView().getModel("ui").getData().sbu);
                _this.showLoadingDialog("Loading...");

                var aTableList = [];
                aTableList.push({
                    modCode: "MRPMOD",
                    tblSrc: "ZDV_3DERP_MRPHDR",
                    tblId: "mrpHdrTab",
                    tblModel: "mrpHdr"
                });

                aTableList.push({
                    modCode: "MRPDTLMOD",
                    tblSrc: "ZDV_MRPDTL",
                    tblId: "mrpDtlTab",
                    tblModel: "mrpDtl"
                });

                _this.getColumns(aTableList);
                
                _this._oDataBeforeChange = {};

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
                this.byId("btnColPropMrpDtl").setEnabled(false);
                this.byId("btnTabLayoutMrpDtl").setEnabled(false);

                this.getView().setModel(new JSONModel({
                    results:[]
                }), "mrpDtl");

                this._tableRendered = "";
                var oTableEventDelegate = {
                    onkeyup: function(oEvent){
                        _this.onKeyUp(oEvent);
                    },

                    onAfterRendering: function(oEvent) {
                        _this.onAfterTableRendering(oEvent);
                    }
                };

                this.byId("mrpHdrTab").addEventDelegate(oTableEventDelegate);

                _this.closeLoadingDialog();
            },

            onAfterTableRender(pTableId, pTableProps) {
                //console.log("onAfterTableRendering", pTableId)
            },

            onSFBInitialise() {
                this.getSbu();
            },

            getSbu() {
                var oModel = this.getOwnerComponent().getModel();
                var oEntitySet = "/SBUSet";

                oModel.read(oEntitySet, {
                    success: function (data, response) {
                        console.log("getSbu", data);
                        
                        if (data.results.length > 0) {
                            // Temporary set default sbu to VER
                            var sbu = "VER";
                            //var sbu = data.results[0].Sbu;
                            
                            if (sbu.toUpperCase() == "VER") {
                                _this.getView().byId("filterPlant").setFilterType("single");
                            }

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

                _aReserveList = [];
                _aForMrList = [];

                var aFilters = this.getView().byId("sfbMRP").getFilters();
                var sFilterGlobal = "";
                if (oEvent) sFilterGlobal = oEvent.getSource()._oBasicSearchField.mProperties.value;
                
                this.getMrpHdr(aFilters, sFilterGlobal);
                this.getProcurePlant();

                this.byId("btnReserveMrpHdr").setEnabled(true);
                this.byId("btnResetMrpHdr").setEnabled(true);
                this.byId("btnExecuteMrpHdr").setEnabled(true);
                this.byId("btnColPropMrpHdr").setEnabled(true);
                this.byId("btnTabLayoutMrpHdr").setEnabled(true);
                this.byId("btnEditMrpDtl").setEnabled(true);
                // this.byId("btnRefreshMrpDtl").setEnabled(true);
                this.byId("btnColPropMrpDtl").setEnabled(true);
                this.byId("btnTabLayoutMrpDtl").setEnabled(true);
            },

            getMrpHdr(pFilters, pFilterGlobal) {
                var oModel = this.getOwnerComponent().getModel();
                oModel.read('/MRPHeaderViewSet', {
                    filters: pFilters,
                    success: function (data, response) {
                        console.log("MRPHeaderViewSet", data)
                        if (data.results.length > 0) {

                            data.results.forEach((item, index) => {
                                if (index === 0) {
                                    item.Active = true;
                                }
                                else {
                                    item.Active = false;
                                }
                            });

                            var aFilterTab = [];
                            if (_this.getView().byId("mrpHdrTab").getBinding("rows")) {
                                aFilterTab = _this.getView().byId("mrpHdrTab").getBinding("rows").aFilters;
                            }

                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                            _this.getView().setModel(oJSONModel, "mrpHdr");
                            _this._tableRendered = "mrpHdrTab";

                            _this.onFilterBySmart("mrpHdr", pFilters, pFilterGlobal, aFilterTab);

                            _this.getView().getModel("ui").setProperty("/activeTransNo", data.results[0].TRANSNO);
                            _this.getView().getModel("ui").setProperty("/activeTransItm", data.results[0].TRANSITM);
                            _this.getView().getModel("ui").setProperty("/activePlantCd", data.results[0].PLANTCD);
                            _this.getView().getModel("ui").setProperty("/activeMatNo", data.results[0].MATNO);
                            _this.getView().getModel("ui").setProperty("/activeHdrRowPath", "/results/0");
                            var iRowCount = _this.getView().byId("mrpHdrTab").getBinding("rows").aIndices.length;
                            _this.getView().getModel("ui").setProperty("/rowCountMrpHdr", iRowCount.toString());

                            _this.setRowReadMode("mrpHdr");
                        } else {
                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                            _this.getView().setModel(oJSONModel, "mrpHdr");
                            _this._tableRendered = "mrpHdrTab";

                            _this.getView().getModel("ui").setProperty("/activeTransNo", "");
                            _this.getView().getModel("ui").setProperty("/activeTransItm", "");
                            _this.getView().getModel("ui").setProperty("/activePlantCd", "");
                            _this.getView().getModel("ui").setProperty("/activeMatNo", "");
                            _this.getView().getModel("ui").setProperty("/activeHdrRowPath", "/results/0");
                            _this.getView().getModel("ui").setProperty("/rowCountMrpHdr", "0");

                            _this.setRowReadMode("mrpHdr");
                        }
                        
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log("error", err)
                        _this.closeLoadingDialog();
                    }
                })
            },

            getProcurePlant() {
                var oModel = this.getOwnerComponent().getModel();
                var sFilter = "SBU eq '" + this.getView().getModel("ui").getData().activeSbu + "'";;

                oModel.read('/MRPProcurePlantSet', {
                    urlParameters: {
                        "$filter": sFilter
                    },
                    success: function (data, response) {
                        console.log("MRPProcurePlantSet", data)
                        if (data.results.length > 0) {
                            _this.getView().setModel(new JSONModel(data), "procurePlant");
                        }
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            lockUnloadMRP(pType, pData) {
                // var sLockedBy;
                // var sLockedDt;

                // if (pType == "LOCK") {
                //     sLockedBy = _startUpInfo.id;
                //     sLockedDt = dateFormat.format(new Date());
                // } else if (pType == "UNLOCK") {
                //     sLockedBy = "";
                //     sLockedDt = "";
                // }

                // var oModel = this.getOwnerComponent().getModel();
                // pData.results.forEach(item => {
                //     var entitySet = "/MRPHeaderSet(TRANSNO='" + item.TRANSNO +"',TRANSITM='" + item.TRANSITM + "')";
                //     var param = {
                //         "LOCKEDBY": sLockedBy,
                //         "LOCKEDDT": sLockedDt
                //     }

                //     oModel.update(entitySet, param, {
                //         method: "PUT",
                //         success: function(data, oResponse) {
                            
                //         },
                //         error: function(err) {}
                //     });
                // })
            },

            onRowSelectionChangeMrpHdr: function(oEvent) {
                var sPath = oEvent.getParameters().rowContext.sPath;

                var sPlantCd = _this.getView().getModel("mrpHdr").getProperty(sPath).PLANTCD;
                var sMatNo =  _this.getView().getModel("mrpHdr").getProperty(sPath).MATNO;
                var sTransNo =  _this.getView().getModel("mrpHdr").getProperty(sPath).TRANSNO;
                var sTransItm =  _this.getView().getModel("mrpHdr").getProperty(sPath).TRANSITM;

                this.getView().getModel("ui").setProperty("/activePlantCd", sPlantCd);
                this.getView().getModel("ui").setProperty("/activeMatNo", sMatNo);
                this.getView().getModel("ui").setProperty("/activeTransNo", sTransNo);
                this.getView().getModel("ui").setProperty("/activeTransItm", sTransItm);
                this.getView().getModel("ui").setProperty("/activeHdrRowPath", sPath);
                
                this.onRowChangedMrpHdr();
            },

            onCellClickMrpHdr: function(oEvent) {
                var sPlantCd = oEvent.getParameters().rowBindingContext.getObject().PLANTCD;
                var sMatNo = oEvent.getParameters().rowBindingContext.getObject().MATNO;
                var sTransNo = oEvent.getParameters().rowBindingContext.getObject().TRANSNO;
                var sTransItm = oEvent.getParameters().rowBindingContext.getObject().TRANSITM;

                this.getView().getModel("ui").setProperty("/activePlantCd", sPlantCd);
                this.getView().getModel("ui").setProperty("/activeMatNo", sMatNo);
                this.getView().getModel("ui").setProperty("/activeTransNo", sTransNo);
                this.getView().getModel("ui").setProperty("/activeTransItm", sTransItm);
                this.getView().getModel("ui").setProperty("/activeHdrRowPath", oEvent.getParameters().rowBindingContext.sPath);

                this.onRowChangedMrpHdr();

                if (oEvent.getParameters().rowBindingContext) {
                    var oTable = oEvent.getSource();
                    var sRowPath = oEvent.getParameters().rowBindingContext.sPath;

                    oTable.getModel("mrpHdr").getData().results.forEach(row => row.ACTIVE = "");
                    oTable.getModel("mrpHdr").setProperty(sRowPath + "/ACTIVE", "X"); 
                    
                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext("mrpHdr") && row.getBindingContext("mrpHdr").sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow")
                    })
                }
            },

            onRowChangedMrpHdr() {
                var sPlantCd = this.getView().getModel("ui").getProperty("/activePlantCd");
                var sMatNo = this.getView().getModel("ui").getProperty("/activeMatNo");
                var sTransNo = this.getView().getModel("ui").getProperty("/activeTransNo");
                var sTransItm = this.getView().getModel("ui").getProperty("/activeTransItm");

                var aMrpDtl = {results: []};
                var aReserveList = jQuery.extend(true, [], _aReserveList);

                aMrpDtl.results.push(...aReserveList.filter(x => x.PLANTCD == sPlantCd && x.MATNO == sMatNo));
                aMrpDtl.results.forEach(item => {
                    var aFormr = _aForMrList.filter(x => x.PLANTCD == item.PLANTCD && x.MATNO == item.MATNO && 
                        x.SLOC == item.SLOC && x.BATCH == item.BATCH);
                        
                    if (aFormr && aFormr.length > 0) {
                        var iSumFormr = 0.000;
                        aFormr.forEach(x => {
                            iSumFormr += parseFloat(x.FORMR);
                        })

                        item.BALANCE = (item.NETAVAILQTY - iSumFormr).toFixed(3);

                        var oFormr = aFormr.filter(x => x.TRANSNO == sTransNo && x.TRANSITM == sTransItm);
                        item.FORMR = (oFormr.length > 0 ? oFormr[0].FORMR : 0.000);
                    }
                })
                
                var oJSONModel = new sap.ui.model.json.JSONModel();
                oJSONModel.setData(aMrpDtl);
                this.getView().setModel(oJSONModel, "mrpDtl");
                this.getView().getModel("ui").setProperty("/rowCountMrpDtl", aMrpDtl.results.length.toString());
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

                    // this.getView().getModel("ui").setProperty("/activePlantCd", sPlantCd);
                    // this.getView().getModel("ui").setProperty("/activeMatNo", sMatNo);
                    // this.getView().getModel("ui").setProperty("/activeTransNo", sTransNo);
                    // this.getView().getModel("ui").setProperty("/activeTransItm", sTransItm);
                    // this.getView().getModel("ui").setProperty("/activeHdrRowPath", '/results/0');

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

                                    var sTransNo = _this.getView().getModel("ui").getProperty("/activeTransNo");
                                    var sTransItm = _this.getView().getModel("ui").getProperty("/activeTransItm");
                                    var oMrpHdr = aDataMrpHdr.filter(x => x.TRANSNO == sTransNo && x.TRANSITM == sTransItm)[0];
                                    var sPlantCd = oMrpHdr.PLANTCD;
                                    var sMatNo = oMrpHdr.MATNO;

                                    aMrpDtl.results.push(...aReserveList.filter(x => x.PLANTCD == sPlantCd && x.MATNO == sMatNo));
                                    oJSONModel.setData(aMrpDtl);
                                    _this.getView().setModel(oJSONModel, "mrpDtl");
                                    _this._tableRendered = "mrpDtlTab";
                                    _this.getView().getModel("ui").setProperty("/rowCountMrpDtl", aMrpDtl.results.length.toString());

                                    if (_aReserveList.length == 0) {
                                        MessageBox.information(_oCaption.INFO_NO_DATA_GENERATED);
                                    }
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
                var oTable = this.getView().byId("mrpHdrTab");
                var aSelIdx = oTable.getSelectedIndices();

                if (aSelIdx.length > 0) { // && _aForMrList.length > 0
                    MessageBox.confirm(_oCaption.CONFIRM_PROCEED_EXECUTEMRP, {
                        actions: ["Yes", "No"],
                        onClose: function (sAction) {
                            if (sAction == "Yes") {
                                _this.showLoadingDialog("Loading...");

                                var aMrTab = [];
                                var aPrTab = [];
                                var aImBatchTab = [];

                                aSelIdx.forEach(selIdx => {
                                    var sPath = oTable.getContextByIndex(selIdx).sPath;
                                    var oMrpHdr = _this.getView().getModel("mrpHdr").getProperty(sPath);

                                    var aForMr = _aForMrList.filter(x => x.TRANSNO == oMrpHdr.TRANSNO && x.TRANSITM == oMrpHdr.TRANSITM);
                                    if (aForMr.length > 0) {
                                        /*aForMr.forEach(item => {
                                            var oImBatchTab = {
                                                "Transcheck": "TPCHK",
                                                "Seqno": "1",
                                                "Issmatno": item.MATNO,
                                                "Rcvmatno": oMrpHdr.MATNO,
                                                "Issbatch": item.BATCH,
                                                "Rcviono": oMrpHdr.IONO,
                                                "Rcvcustgrp": oMrpHdr.CUSTGRP,
                                                "Rcvsalesgrp": oMrpHdr.SALESGRP,
                                                "Xfertolia": "",
                                                "Userid": _startUpInfo.id,
                                            }

                                            aImBatchTab.push(oImBatchTab);
                                        });*/

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
                                                "Rcvbatch": oMrpHdr.IONO,
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
                                        // "Plant": (_this.getView().getModel("procurePlant").getData().results.length > 0 ? 
                                        //     _this.getView().getModel("procurePlant").getData().results[0].PLANTCD : ""),
                                        "Plant": (oMrpHdr.PURPLANTHDR.length > 0 ? oMrpHdr.PURPLANTHDR :
                                            _this.getView().getModel("procurePlant").getData().results[0].PLANTCD),
                                        "MatGrp": oMrpHdr.MATGRP,
                                        "Quantity": oMrpHdr.FORPR,
                                        "Unit": oMrpHdr.BASEUOM,
                                        "Batch": oMrpHdr.IONO,
                                        "FixedVend": oMrpHdr.VENDORCD,
                                        "PurchOrg": oMrpHdr.PURCHORG,
                                        // "ProcuringPlant": (_this.getView().getModel("procurePlant").getData().results.length > 0 ? 
                                        //     _this.getView().getModel("procurePlant").getData().results[0].PLANTCD : ""),
                                        "ProcuringPlant": (oMrpHdr.PURPLANTHDR.length > 0 ? oMrpHdr.PURPLANTHDR :
                                            _this.getView().getModel("procurePlant").getData().results[0].PLANTCD),
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
                                var oModel = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                                oParam["N_IOMrp_Imp_Mrtab"] = aMrTab;
                                oParam["N_IOMrp_Imp_Prtab"] = aPrTab;
                                oParam["N_IOMrp_Exp_Mrtab"] = [];
                                oParam["N_IOMrp_Exp_Prtab"] = [];
                                oParam["N_IOMrp_Exp_Retmsg"] = [];

                                console.log("onExecuteMrpHdr param", oParam)
                                oModel.create("/EMrtabSet", oParam, {
                                    method: "POST",
                                    success: function(oResult, oResponse) {
                                        console.log("onExecuteMrpHdr", oResult);
                                        var aMRCreated = [];
                                        var aPRCreated = [];
                                        var sMessage = "";

                                        oResult.N_IOMrp_Exp_Mrtab.results.forEach(item => {
                                            if (item.Rsvno && !aMRCreated.includes(item.Rsvno)) aMRCreated.push(item.Rsvno);
                                        })

                                        oResult.N_IOMrp_Exp_Prtab.results.forEach(item => {
                                            if (item.PreqNo && !aPRCreated.includes(item.PreqNo)) aPRCreated.push(item.PreqNo);
                                        })

                                        if (aMRCreated.length > 0) {
                                            sMessage += "Below are successfully created MR: \n";
                                            aMRCreated.forEach(item => {
                                                sMessage += item + "\n";
                                            })
                                        }

                                        if (aPRCreated.length > 0) {
                                            sMessage += "Below are successfully created PR: \n";
                                            aPRCreated.forEach(item => {
                                                sMessage += item + "\n";
                                            })
                                        }

                                        if (sMessage.length == 0) {
                                            oResult.N_IOMrp_Exp_Retmsg.results.forEach(item => {
                                                if (item.Message) sMessage += item.Message + "\n";
                                            })
                                        }

                                        //MessageBox.information(_oCaption.INFO_EXECUTE_SUCCESS);
                                        MessageBox.information(sMessage);

                                        _this.getView().getModel("mrpDtl").setProperty("/results", []);
                                        _this.onSearchMrpHdr();
                                        _aReserveList = [];
                                        _aForMrList = [];

                                        _this.closeLoadingDialog();
                                    },
                                    error: function(err) {
                                        MessageBox.error(_oCaption.INFO_EXECUTE_FAIL);
                                        console.log("error", err);
                                        _this.closeLoadingDialog();
                                    }
                                });
                                
                                /* Remove CreateBatchSeq 12/23/2022
                                var oParam = {};
                                var oParamSeq = {};
                                var oModel = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                                oParamSeq["N_ImBatchTab"] = aImBatchTab;
                                oParamSeq["N_MatBatchTab"] = []
                                oParamSeq["N_ExReturnTab"] = [];

                                console.log("CreateBatchSeq param", oParamSeq)
                                oModel.create("/CreateBatchSeqSet", oParamSeq, {
                                    method: "POST",
                                    success: function(oResult, oResponse) {
                                        console.log("CreateBatchSeqSet", oResult);
                                        oResult["N_MatBatchTab"].results.forEach((itemBatch, itemIdx) => {
                                            aMrTab[itemIdx].Rcvbatch = itemBatch.Batch;
                                        })

                                        oParam["N_IOMrp_Imp_Mrtab"] = aMrTab;
                                        oParam["N_IOMrp_Imp_Prtab"] = aPrTab;
                                        oParam["N_IOMrp_Exp_Mrtab"] = [];
                                        oParam["N_IOMrp_Exp_Prtab"] = [];
                                        oParam["N_IOMrp_Exp_Retmsg"] = [];

                                        console.log("onExecuteMrpHdr param", oParam)
                                        oModel.create("/EMrtabSet", oParam, {
                                            method: "POST",
                                            success: function(oResult, oResponse) {
                                                console.log("onExecuteMrpHdr", oResult);
                                                var aMRCreated = [];
                                                var aPRCreated = [];
                                                var sMessage = "";

                                                oResult.N_IOMrp_Exp_Mrtab.results.forEach(item => {
                                                    if (item.Rsvno && !aMRCreated.includes(item.Rsvno)) aMRCreated.push(item.Rsvno);
                                                })

                                                oResult.N_IOMrp_Exp_Prtab.results.forEach(item => {
                                                    if (item.PreqNo && !aPRCreated.includes(item.PreqNo)) aPRCreated.push(item.PreqNo);
                                                })

                                                if (aMRCreated.length > 0) {
                                                    sMessage += "Below are successfully created MR: \n";
                                                    aMRCreated.forEach(item => {
                                                        sMessage += item + "\n";
                                                    })
                                                }

                                                if (aPRCreated.length > 0) {
                                                    sMessage += "Below are successfully created PR: \n";
                                                    aPRCreated.forEach(item => {
                                                        sMessage += item + "\n";
                                                    })
                                                }

                                                if (sMessage.length == 0) {
                                                    oResult.N_IOMrp_Exp_Retmsg.results.forEach(item => {
                                                        if (item.Message) sMessage += item.Message + "\n";
                                                    })
                                                }

                                                //MessageBox.information(_oCaption.INFO_EXECUTE_SUCCESS);
                                                MessageBox.information(sMessage);

                                                _this.getView().getModel("mrpDtl").setProperty("/results", []);
                                                _this.onSearchMrpHdr();
                                                _aReserveList = [];
                                                _aForMrList = [];
                                            },
                                            error: function(err) {
                                                MessageBox.error(_oCaption.INFO_EXECUTE_FAIL);
                                                console.log("error", err);
                                                _this.closeLoadingDialog();
                                            }
                                        });

                                        _this.closeLoadingDialog();
                                    },
                                    error: function(err) {
                                        MessageBox.error(_oCaption.INFO_EXECUTE_FAIL);
                                        console.log("error", err);
                                    }
                                });
                                */
                            }
                        }
                    });

                    
                // } else if (_aForMrList.length == 0) {
                //     MessageBox.warning(_oCaption.INFO_NO_DATA_EXEC);
                //     _this.closeLoadingDialog();
                } else {
                    MessageBox.warning(_oCaption.INFO_NO_SELECTED);
                    _this.closeLoadingDialog();
                }
            },

            onAfterTableRendering: function(oEvent) {
                console.log(this._tableRendered)
                if (this._tableRendered !== "") {
                    this.setActiveRowHighlight(this._tableRendered.replace("Tab", ""));
                    this._tableRendered = "";
                } 
            },

            onEditMrpDtl() {
                var aRows = this.getView().getModel("mrpDtl").getData().results;
                //var oTable = this.getView().byId("mrpDtlTab");
                
                if (aRows.length > 0) {
                    this.byId("btnEditMrpDtl").setVisible(false);
                    this.byId("btnSaveMrpDtl").setVisible(true);
                    this.byId("btnCancelMrpDtl").setVisible(true);
                    // this.byId("btnRefreshMrpDtl").setVisible(false);
                    this.byId("btnColPropMrpDtl").setVisible(false);
                    this.byId("btnTabLayoutMrpDtl").setVisible(false);

                    // Disable header
                    this.byId("mrpHdrTab").setShowOverlay(true);

                    // 
                    ///var oSmartFilter = this.getView().byId("sfbMRP");
                    this.getView().byId("sfbMRP").setShowFilterConfiguration(false);

                    this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("mrpDtl").getData());

                    this.getView().getModel("mrpDtl").getData().results.forEach(item => item.FORMR = null);
                    this.setRowEditMode("mrpDtl");
                } else {
                    MessageBox.warning(_oCaption.INFO_NO_DATA_EDIT);
                }
            },

            onInputLiveChange: function(oEvent) {
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;

                this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);
            },

            onNumberLiveChange: function(oEvent) {
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

                _this.onForMrChange(oEvent);
            },

            onForMrChange: function(oEvent) {
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;

                _this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);

                var oModel = _this.getView().getModel(sModel).getProperty(sRowPath);
                var iNewValue = parseInt(oEvent.getParameters().newValue);

                var oDataUI = _this.getView().getModel("ui").getData();
                var aRow = _this.getView().getModel(sModel).getProperty(sRowPath);
                var aFormr = _aForMrList.filter(x => x.PLANTCD == aRow.PLANTCD && 
                    x.MATNO == aRow.MATNO && x.SLOC == aRow.SLOC && x.BATCH == aRow.BATCH &&
                    x.TRANSNO != oDataUI.activeTransNo && x.TRANSITM != oDataUI.activeTransItm);

                var iSumFormr = 0.000;
                if (aFormr.length) {
                    aFormr.forEach(item => {
                        iSumFormr += item.FORMR;
                    })
                }

                var iBalance = oModel.NETAVAILQTY - iSumFormr - (iNewValue ? iNewValue : 0);
                _this.getView().getModel(sModel).setProperty(sRowPath + "/BALANCE", iBalance.toFixed(3));
            },

            onSaveMrpDtl() {
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

                var sRowPath = this.getView().getModel("ui").getProperty("/activeHdrRowPath");
                var oDataHdr = this.getView().getModel("mrpHdr").getProperty(sRowPath);
                var aRows = this.getView().getModel("mrpDtl").getData().results;
                var dSumFormr = 0.0;

                aRows.forEach(item => {
                    if (item.FORMR && parseFloat(item.FORMR) > 0) {
                        dSumFormr += parseFloat(item.FORMR);
                    }
                });

                if (dSumFormr >  oDataHdr.BALANCE) {
                    MessageBox.warning(_oCaption.WARN_TOTAL_FORMR_GREATER_REQQTY);
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
                    sRowPath = this.getView().getModel("ui").getProperty("/activeHdrRowPath");
                    dSumFormr = 0.0;

                    _aForMrList.forEach(item => {
                        if (item.TRANSNO == sTransNo && item.TRANSITM == sTransItm) {
                            dSumFormr += parseFloat(item.FORMR);
                        }
                    })

                    this.getView().getModel("mrpHdr").setProperty(sRowPath + "/FORMR", dSumFormr.toFixed(3));

                    // Update Mrp Header column For Pr
                    var oMrpHdr = this.getView().getModel("mrpHdr").getProperty(sRowPath);
                    var dBalance = parseFloat(oMrpHdr.BALANCE - dSumFormr);
                    
                    this.getView().getModel("mrpHdr").setProperty(sRowPath + "/FORPR", dBalance.toFixed(3));

                    this.byId("btnEditMrpDtl").setVisible(true);
                    this.byId("btnSaveMrpDtl").setVisible(false);
                    this.byId("btnCancelMrpDtl").setVisible(false);
                    // this.byId("btnRefreshMrpDtl").setVisible(true);
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
                            // _this.byId("btnRefreshMrpDtl").setVisible(true);
                            _this.byId("btnColPropMrpDtl").setVisible(true);
                            _this.byId("btnTabLayoutMrpDtl").setVisible(true);

                            // Disable header
                            _this.byId("mrpHdrTab").setShowOverlay(false);
                                        
                            _this.setRowReadMode("mrpDtl");
                            _this.getView().getModel("mrpDtl").setProperty("/", _this._oDataBeforeChange);
                            
                        }
                    }
                });
            },

            onRefreshMrpDtl() {
                //this.onReserveMrpHdr()();
            },

            onKeyUp(oEvent) {
                if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows") {
                    var oTable = this.byId(oEvent.srcControl.sId).oParent;

                    if (oTable.getId().indexOf("mrpHdrTab") >= 0) {
                        var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["mrpHdr"].sPath;
                        var oRow = this.getView().getModel("mrpHdr").getProperty(sRowPath);
                        this.getView().getModel("ui").setProperty("/activeGmc", oRow.GMC);
                        this.getView().getModel("ui").setProperty("/activePlantCd", oRow.PLANTCD);
                        this.getView().getModel("ui").setProperty("/activeMatNo", oRow.MATNO);
                        this.getView().getModel("ui").setProperty("/activeTransNo", oRow.TRANSNO);
                        this.getView().getModel("ui").setProperty("/activeTransItm", oRow.TRANSITM);
                        this.getView().getModel("ui").setProperty("/activeHdrRowPath", sRowPath);

                        this.onRowChangedMrpHdr();

                        if (this.byId(oEvent.srcControl.sId).getBindingContext("mrpHdr")) {
                            var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext("mrpHdr").sPath;
                            
                            oTable.getModel("mrpHdr").getData().results.forEach(row => row.ACTIVE = "");
                            oTable.getModel("mrpHdr").setProperty(sRowPath + "/ACTIVE", "X"); 
                            
                            oTable.getRows().forEach(row => {
                                if (row.getBindingContext("mrpHdr") && row.getBindingContext("mrpHdr").sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                                    row.addStyleClass("activeRow");
                                }
                                else row.removeStyleClass("activeRow")
                            })
                        }
                    } else if (oTable.getId().indexOf("mrpDtlTab") >= 0) {
                        if (this.byId(oEvent.srcControl.sId).getBindingContext("mrpDtl")) {
                            var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext("mrpDtl").sPath;
                            
                            oTable.getModel("mrpDtl").getData().results.forEach(row => row.ACTIVE = "");
                            oTable.getModel("mrpDtl").setProperty(sRowPath + "/ACTIVE", "X"); 
                            
                            oTable.getRows().forEach(row => {
                                if (row.getBindingContext("mrpDtl") && row.getBindingContext("mrpDtl").sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                                    row.addStyleClass("activeRow");
                                }
                                else row.removeStyleClass("activeRow")
                            })
                        }
                    }
                }
            },

            onSaveTableLayout: function (oEvent) {
                //saving of the layout of table
                var me = this;
                var ctr = 1;
                var oTable = oEvent.getSource().oParent.oParent;
                // var oTable = this.getView().byId("mainTab");
                var oColumns = oTable.getColumns();
                var vSBU = this.getView().getModel("ui").getData().activeSbu;
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
                        _this.closeLoadingDialog();
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

                // Label
                oDDTextParam.push({CODE: "ROWS"});

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
                oDDTextParam.push({CODE: "INFO_EXECUTE_SUCCESS"});
                oDDTextParam.push({CODE: "INFO_EXECUTE_FAIL"});
                oDDTextParam.push({CODE: "CONFIRM_PROCEED_EXECUTEMRP"});
                oDDTextParam.push({CODE: "INFO_NO_DATA_GENERATED"});
                oDDTextParam.push({CODE: "WARN_TOTAL_FORMR_GREATER_REQQTY"});
                
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
                        _this.closeLoadingDialog();
                    }
                });
            }
        });
    });
