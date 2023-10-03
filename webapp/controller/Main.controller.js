sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (BaseController, JSONModel, MessageBox) {
        "use strict";

        var _this;
        var _oCaption = {};
        var _aSmartFilter;
        var _sSmartFilterGlobal;
        var _aTableProp = [];
        var _startUpInfo = {};
        var _aReserveList = [];
        var _aForMrList = [];

        return BaseController.extend("zuimrp.controller.Main", {
            onInit: function () {
                _this = this;

                _this.getCaption();

                var oModel = this.getOwnerComponent().getModel("MRPFilters");
                var oSmartFilter = this.getView().byId("sfbMRP");
                oSmartFilter.setModel(oModel);

                _this.initializeComponent();
            },

            onExit() {
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

                this.onInitBase(_this, _this.getView().getModel("ui").getData().sbu);
                this.getAppAction();

                if (sap.ushell.Container) {
                    var oModelStartUp= new sap.ui.model.json.JSONModel();
                    oModelStartUp.loadData("/sap/bc/ui2/start_up").then(() => {
                        _startUpInfo = oModelStartUp.oData;
                    });
                }
                else {
                    _startUpInfo.id = "BAS_CONN";
                }

                setTimeout(() => {
                    var bAppChange = _this.getView().getModel("base").getProperty("/appChange");
                    _this.setControlAppAction(bAppChange);
                }, 100);

                _this.showLoadingDialog("Loading...");

                _aTableProp.push({
                    modCode: "MRPMOD",
                    tblSrc: "ZDV_3DERP_MRPHDR",
                    tblId: "mrpHdrTab",
                    tblModel: "mrpHdr"
                });

                _aTableProp.push({
                    modCode: "MRPDTLMOD",
                    tblSrc: "ZDV_MRPDTL",
                    tblId: "mrpDtlTab",
                    tblModel: "mrpDtl"
                });

                _this.getColumns(_aTableProp);

                var aSmartFilter = this.getView().byId("sfbMRP").getFilters();
                if (aSmartFilter.length == 0) {
                    // Disable all buttons
                    this.byId("btnCancelMrpHdr").setEnabled(false);
                    this.byId("btnResetMrpHdr").setEnabled(false);
                    this.byId("btnExecuteMrpHdr").setEnabled(false);
                    this.byId("btnTabLayoutMrpHdr").setEnabled(false);
                    this.byId("btnEditMrpDtl").setEnabled(false);
                    this.byId("btnRefreshMrpDtl").setEnabled(false);
                    this.byId("btnTabLayoutMrpDtl").setEnabled(false);
                }

                _this._tableRendered = "";
                var oTableEventDelegate = {
                    onkeyup: function(oEvent){
                        _this.onKeyUp(oEvent);
                    },

                    onAfterRendering: function(oEvent) {
                        _this.onAfterTableRendering(oEvent);
                    }
                };

                this.byId("mrpHdrTab").addEventDelegate(oTableEventDelegate);
                this.byId("mrpDtlTab").addEventDelegate(oTableEventDelegate);

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

                            //_this.closeLoadingDialog();                         
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

                var aSmartFilter = this.getView().byId("sfbMRP").getFilters();
                var sSmartFilterGlobal = "";
                if (oEvent) sSmartFilterGlobal = oEvent.getSource()._oBasicSearchField.mProperties.value;
                
                this.getMrpHdr(aSmartFilter, sSmartFilterGlobal);
                this.getProcurePlant();

                this.byId("btnCancelMrpHdr").setEnabled(true);
                // this.byId("btnReserveMrpHdr").setEnabled(true);
                this.byId("btnResetMrpHdr").setEnabled(true);
                this.byId("btnExecuteMrpHdr").setEnabled(true);
                // this.byId("btnColPropMrpHdr").setEnabled(true);
                this.byId("btnTabLayoutMrpHdr").setEnabled(true);
                this.byId("btnEditMrpDtl").setEnabled(true);
                // this.byId("btnRefreshMrpDtl").setEnabled(true);
                // this.byId("btnColPropMrpDtl").setEnabled(true);
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
                                item.WITHRESERVED = false;

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

                            //_this.onFilterBySmart("mrpHdr", pFilters, pFilterGlobal, aFilterTab);
                            _this.onFilterByCol("mrpHdr", aFilterTab);

                            _this.getView().getModel("ui").setProperty("/activeTransNo", data.results[0].TRANSNO);
                            _this.getView().getModel("ui").setProperty("/activeTransItm", data.results[0].TRANSITM);
                            _this.getView().getModel("ui").setProperty("/activePlantCd", data.results[0].PLANTCD);
                            _this.getView().getModel("ui").setProperty("/activeMatNo", data.results[0].MATNO);
                            _this.getView().getModel("ui").setProperty("/activeHdrRowPath", "/results/0");
                            var iRowCount = _this.getView().byId("mrpHdrTab").getBinding("rows").aIndices.length;
                            _this.getView().getModel("ui").setProperty("/rowCountMrpHdr", iRowCount.toString());

                            _this.setRowReadMode("mrpHdr");

                            _this.onReserveMrpHdr(true);
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

                            // clear detail
                            _this.getView().setModel(new JSONModel({
                                results: []
                            }), "mrpDtl");
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
                var sFilter = "SBU eq '" + this.getView().getModel("ui").getData().sbu + "'";;

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
                if (oEvent.getParameters().rowContext) {
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
                }  
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

                aMrpDtl.results.push(...aReserveList.filter(x => x.PLANTCD == sPlantCd && x.HDRMATNO == sMatNo));
                aMrpDtl.results.forEach(item => {
                    var aFormr = _aForMrList.filter(x => x.PLANTCD == item.PLANTCD && x.MATNO == item.HDRMATNO && 
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

            onCancelMrpHdr() {
                var oTable = this.getView().byId("mrpHdrTab");
                var aSelIdx = oTable.getSelectedIndices();

                if (aSelIdx.length == 0) {
                    MessageBox.warning(_oCaption.INFO_NO_SELECTED);
                    return;
                }

                MessageBox.confirm(_oCaption.CONFIRM_PROCEED_EXECUTE, {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction == "Yes") {
                            _this.showLoadingDialog("Loading...");

                            var aOrigSelIdx = [];
                            aSelIdx.forEach(i => {
                                aOrigSelIdx.push(oTable.getBinding("rows").aIndices[i]);
                            })

                            
                            var oModel = _this.getOwnerComponent().getModel();
                            aOrigSelIdx.forEach((item, iIdx) => {
                                var oDataHdr = _this.getView().getModel("mrpHdr").getProperty("/results/" + item.toString());
                                var entitySet = "/MRPHeaderSet(Transno='" + oDataHdr.TRANSNO +"',Transitm='" + oDataHdr.TRANSITM + "')";
                                var param = {
                                    "Deleted": "X"
                                }
            
                                setTimeout(() => {
                                    oModel.update(entitySet, param, {
                                        method: "PUT",
                                        success: function(data, oResponse) {
                                            if (iIdx == aOrigSelIdx.length - 1) {
                                                _this.closeLoadingDialog();

                                                MessageBox.information(_oCaption.INFO_EXECUTE_SUCCESS, {
                                                    onClose: function (sAction) {
                                                        _this.onSearchMrpHdr();
                                                    }
                                                });
                                            }
                                        },
                                        error: function(err) {
                                            _this.closeLoadingDialog();
                                        }
                                    });
                                });
                            })
                        }
                    }
                });
            },

            onReserveMrpHdr(pAuto) {
                this.showLoadingDialog("Loading...");

                var oTable = this.byId("mrpHdrTab");
                var aSelIdx = [];
                var aData = [];

                if (pAuto) {
                    var iRowCount = oTable.getBinding("rows").aIndices.length;
                    for (var i = 0; i < iRowCount; i++) {
                        aSelIdx.push(i);
                    }
                } else {
                    aSelIdx = oTable.getSelectedIndices();
                }
                
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

                    var oModel = this.getOwnerComponent().getModel();
                    var oEntitySet = "/MRPDetailViewSet";
                    var oJSONModel = new sap.ui.model.json.JSONModel();
    
                    // _aReserveList = [];
                    // _aForMrList = [];

                    aData.forEach((item, idx) => {
                        //console.log("adata", item)

                        // Clear For MR Reservation
                        var bExist = false;
                        for (var i = 0; i < _aForMrList.length; i++) {
                            
                            if (_aForMrList[i].TRANSNO == item.TRANSNO && _aForMrList[i].TRANSITM == item.TRANSITM) {
                                
                                bExist = true;
                                _aForMrList.splice(i, 1);
                                i = -1;
                            }

                            if (i == _aForMrList.length - 1 && bExist == true) {
                                var iHdr = _this.getView().getModel("mrpHdr").getData().results.findIndex(
                                    x => x.TRANSNO == item.TRANSNO && x.TRANSITM == item.TRANSITM);
                                var sQty = _this.getView().getModel("mrpHdr").getProperty("/results/" + iHdr.toString() + "/BALANCE")
                                _this.getView().getModel("mrpHdr").setProperty("/results/" + iHdr.toString() + "/FORMR", "0.000");
                                _this.getView().getModel("mrpHdr").setProperty("/results/" + iHdr.toString() + "/FORPR", parseFloat(sQty).toFixed(3));
                            }
                        }
                        
                        oModel.read(oEntitySet, {
                            urlParameters: {
                                "$filter": "PLANTCD eq '" + item.PLANTCD + "' and HDRMATNO eq '" + item.MATNO + "'"
                            },
                            success: function (data, response) {
                                console.log("MRPDetailViewSet", data);
                                
                                data.results.forEach((item2, idx2) => {
                                    var iRsv = _aReserveList.findIndex(x => x.PLANTCD == item2.PLANTCD && x.HDRMATNO == item2.HDRMATNO);
                                    if (iRsv > -1) _aReserveList.splice(iRsv, 1);
                                })
                                
                                _aReserveList.push(...data.results);

                                if (idx == aData.length - 1) {
                                    var aMrpDtl = {results:[]};
                                    var aReserveList = jQuery.extend(true, [], _aReserveList);

                                    var sTransNo = _this.getView().getModel("ui").getProperty("/activeTransNo");
                                    var sTransItm = _this.getView().getModel("ui").getProperty("/activeTransItm");
                                    var oMrpHdr = aDataMrpHdr.filter(x => x.TRANSNO == sTransNo && x.TRANSITM == sTransItm)[0];
                                    var sPlantCd = oMrpHdr.PLANTCD;
                                    var sMatNo = oMrpHdr.MATNO;

                                    // Highlight header rows with details
                                    aDataMrpHdr.forEach(item => {
                                        if (aReserveList.filter(x => x.PLANTCD == item.PLANTCD && x.HDRMATNO == item.MATNO).length > 0) {
                                            
                                            var aDataMrpHdrAll = jQuery.extend(true, [], 
                                                _this.getView().getModel("mrpHdr").getData().results);
                                            var iIdx = aDataMrpHdrAll.findIndex(
                                                x => x.TRANSNO == item.TRANSNO && x.TRANSITM == item.TRANSITM
                                            );

                                            if (iIdx >= 0) {
                                                _this.getView().getModel("mrpHdr").setProperty("/results/" + 
                                                iIdx.toString() + "/WITHRESERVED", true);
                                            }
                                        }
                                    })

                                    aMrpDtl.results.push(...aReserveList.filter(x => x.PLANTCD == sPlantCd && x.HDRMATNO == sMatNo));
                                    oJSONModel.setData(aMrpDtl);
                                    _this.getView().setModel(oJSONModel, "mrpDtl");
                                    _this._tableRendered = "mrpDtlTab";
                                    _this.getView().getModel("ui").setProperty("/rowCountMrpDtl", aMrpDtl.results.length.toString());

                                    if (_aReserveList.length == 0 && pAuto == false) {
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
                    MessageBox.confirm(_oCaption.CONFIRM_PROCEED_RESET_MRP, {
                        actions: ["Yes", "No"],
                        onClose: function (sAction) {
                            if (sAction == "Yes") {
                                var oTable = _this.byId("mrpHdrTab");
                                var aSelIdx = oTable.getSelectedIndices();

                                if (aSelIdx.length > 0) {
                                    _this.onReserveMrpHdr(false);
                                }
                                else {
                                    _this.getView().getModel("mrpDtl").setProperty("/results", []);
                                    _this.onSearchMrpHdr();
                                }
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
                                                if (item.Message && !sMessage.includes(item.Message)) sMessage += item.Message + "\n";
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
                            }
                        }
                    });
                } else {
                    MessageBox.warning(_oCaption.INFO_NO_SELECTED);
                    _this.closeLoadingDialog();
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

                    // Hide Smart Filter button
                    var oSmartFilter = this.getView().byId("sfbMRP");
                    oSmartFilter.setShowFilterConfiguration(false);
                    oSmartFilter.setShowClearButton(false);
                    oSmartFilter.setShowGoButton(false);

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
                var iNewValue = parseFloat(oEvent.getParameters().newValue);

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

                    // Hide Smart Filter button
                    var oSmartFilter = this.getView().byId("sfbMRP");
                    oSmartFilter.setShowFilterConfiguration(true);
                    oSmartFilter.setShowClearButton(true);
                    oSmartFilter.setShowGoButton(true);
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

                            // Hide Smart Filter button
                            var oSmartFilter = _this.getView().byId("sfbMRP");
                            oSmartFilter.setShowFilterConfiguration(true);
                            oSmartFilter.setShowClearButton(true);
                            oSmartFilter.setShowGoButton(true);
                                        
                            _this.setRowReadMode("mrpDtl");
                            _this.getView().getModel("mrpDtl").setProperty("/", _this._oDataBeforeChange);
                            
                        }
                    }
                });
            },

            onRefreshMrpDtl() {
                //this.onReserveMrpHdr()();
            },

            setControlAppAction(pChange) {
                // Header
                this.byId("btnCancelMrpHdr").setVisible(pChange);
                this.byId("btnResetMrpHdr").setVisible(pChange);
                this.byId("btnExecuteMrpHdr").setVisible(pChange);
                this.byId("btnTabLayoutMrpHdr").setVisible(true);

                // Detail
                this.byId("btnEditMrpDtl").setVisible(pChange);
                //this.byId("btnRefreshMrpDtl").setVisible(true);
                this.byId("btnTabLayoutMrpDtl").setVisible(true);
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
                oDDTextParam.push({CODE: "MATNO"});

                // Label
                oDDTextParam.push({CODE: "ROWS"});

                // Button
                oDDTextParam.push({CODE: "CANCELMRP"});
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
                oDDTextParam.push({CODE: "CONFIRM_PROCEED_EXECUTE"});
                oDDTextParam.push({CODE: "CONFIRM_PROCEED_RESET_MRP"});
                
                oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {
                        // console.log(oData.CaptionMsgItems.results)
                        oData.CaptionMsgItems.results.forEach(item => {
                            oDDTextResult[item.CODE] = item.TEXT;
                        })

                        oJSONModel.setData(oDDTextResult);
                        _this.getView().setModel(oJSONModel, "caption");

                        _oCaption = _this.getView().getModel("caption").getData();
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });
            }
        });
    });
