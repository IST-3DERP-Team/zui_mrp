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
  ], function (Controller, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController, MessageToast, SearchField) {
  
    "use strict";

    var _this;
    var _aTable = [];
    var _sSbu = "";

    var _sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
    var _sapDateTimeFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd HH24:MI:SS" });
    var _sapTimeFormat = sap.ui.core.format.DateFormat.getTimeInstance({pattern: "KK:mm:ss a"});
   
    return Controller.extend("zuimrp.controller.BaseController", {

        onInitBase(pThis, pSbu) {
            _this = pThis;
            _sSbu = pSbu;

            this._aColumns = {};
            this._aFilterableColumns = {};
            this._aSortableColumns = {};
            this._oViewSettingsDialog = {};
        },
   
        getColumns: async function(pTableList) {
            _aTable = pTableList;

            var oModelColumns = new JSONModel();
            var sPath = jQuery.sap.getModulePath("zuimrp", "/model/columns.json")
            await oModelColumns.loadData(sPath);

            var oColumns = oModelColumns.getData();
            var oModel = this.getOwnerComponent().getModel();

            oModel.metadataLoaded().then(() => {
                pTableList.forEach(item => {
                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, item);
                    }, 100);
                });
            })
        },

        getDynamicColumns(pColumn, pTable) {
            var oColumns = pColumn;
            var modCode = pTable.modCode;
            var tblSrc = pTable.tblSrc;
            var tblId = pTable.tblId;
            var tblModel = pTable.tblModel;

            var oJSONColumnsModel = new JSONModel();
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
            oModel.setHeaders({
                sbu: _sSbu,
                type: modCode,
                tabname: tblSrc
            });
            
            oModel.read("/ColumnsSet", {
                success: function (oData, oResponse) {
                    oJSONColumnsModel.setData(oData);

                    if (oData.results.length > 0) {
                        oData.results.forEach(col => {
                            if (col.ColumnName == "COMPLETE")
                            col.DataType =  "BOOLEAN";
                        })
                        
                        var aColumns = _this.setTableColumns(oColumns[tblModel], oData.results);   
                        _this._aColumns[tblModel] = aColumns["columns"];
                        _this._aFilterableColumns[tblModel] = aColumns["filterableColumns"]; 
                        _this._aSortableColumns[tblModel] = aColumns["sortableColumns"]; 
                        if (_this.byId(tblId).getColumns().length == 0) {
                            _this.addColumns(_this.byId(tblId), aColumns["columns"], tblModel);
                        }

                        var tblProps = {
                            aColumns: _this._aColumns[tblModel],
                            aFilterableColumns: _this._aFilterableColumns[tblModel],
                            aSortableColumns: _this._aSortableColumns[tblModel]
                        };
                        _this.onAfterTableRender(tblId, tblProps);
                    }
                },
                error: function (err) {
                    console.log("err", err)
                    _this.closeLoadingDialog();
                }
            });
        },

        setTableColumns: function(pColumnLocal, pColumn) {
            var oColumnLocal = (pColumnLocal ? pColumnLocal : []);
            var oColumn = pColumn;
            
            var aColumns = [];
            var aFilterableColumns = [];
            var aSortableColumns = [];

            oColumn.forEach((prop, idx) => {
                var vCreatable = prop.Creatable;
                var vUpdatable = prop.Editable;
                var vSortable = true;
                var vSorted = prop.Sorted;
                var vSortOrder = prop.SortOrder;
                var vFilterable = true;
                var vName = prop.ColumnLabel;
                var oColumnLocalProp = oColumnLocal.filter(col => col.name.toUpperCase() === prop.ColumnName);
                var vShowable = true;
                var vOrder = prop.Order;

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
                    precision: prop.Length,
                    scale: prop.Decimal //prop.Scale !== undefined ? prop.Scale : null
                })
            })

            _this.createViewSettingsDialog("sort", 
                new JSONModel({
                    items: aSortableColumns,
                    rowCount: aSortableColumns.length,
                    activeRow: 0,
                    table: ""
                })
            );

            _this.createViewSettingsDialog("filter", 
                new JSONModel({
                    items: aFilterableColumns,
                    rowCount: aFilterableColumns.length,
                    table: ""
                })
            );

            aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
            var aColumnProp = aColumns.filter(item => item.showable === true);

            _this.createViewSettingsDialog("column", 
                new JSONModel({
                    items: aColumnProp,
                    rowCount: aColumnProp.length,
                    table: ""
                })
            );

            return { columns: aColumns, sortableColumns: aSortableColumns, filterableColumns: aFilterableColumns };
        },

        addColumns(pTable, pColumn, pModel) {
            var aColumns = pColumn.filter(item => item.showable === true)
            aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));

            aColumns.forEach(col => {
                // console.log(col)
                if (col.type === "STRING" || col.type === "DATETIME") {
                    pTable.addColumn(new sap.ui.table.Column({
                        id: pModel + "Col" + col.name,
                        width: col.width,
                        sortProperty: col.name,
                        filterProperty: col.name,
                        label: new sap.m.Text({text: col.label}),
                        template: new sap.m.Text({text: "{" + pModel + ">" + col.name + "}"}),
                        visible: col.visible
                    }));
                }
                else if (col.type === "NUMBER") {
                    pTable.addColumn(new sap.ui.table.Column({
                        id: pModel + "Col" + col.name,
                        width: col.width,
                        hAlign: "End",
                        sortProperty: col.name,
                        filterProperty: col.name,
                        label: new sap.m.Text({text: col.label}),
                        template: new sap.m.Text({text: "{" + pModel + ">" + col.name + "}"}),
                        visible: col.visible
                    }));
                }
                else if (col.type === "BOOLEAN" ) {
                    pTable.addColumn(new sap.ui.table.Column({
                        id: pModel + "Col" + col.name,
                        width: col.width,
                        hAlign: "Center",
                        sortProperty: col.name,
                        filterProperty: col.name,                            
                        label: new sap.m.Text({text: col.label}),
                        template: new sap.m.CheckBox({selected: "{" + pModel + ">" + col.name + "}", editable: false}),
                        visible: col.visible
                    }));
                }
            })
        },

        setRowReadMode(pModel) {
            if (!_this._aColumns[pModel]) return;

            var oTable = this.byId(pModel + "Tab");
            oTable.getColumns().forEach((col, idx) => {     
                _this._aColumns[pModel].filter(item => item.label === col.getLabel().getText())
                    .forEach(ci => {
                        if (ci.type === "STRING" || ci.type === "NUMBER") {
                            col.setTemplate(new sap.m.Text({
                                text: "{" + pModel + ">" + ci.name + "}",
                                wrapping: false,
                                tooltip: "{" + pModel + ">" + ci.name + "}"
                            }));
                        }
                        else if (ci.type === "BOOLEAN") {
                            col.setTemplate(new sap.m.CheckBox({selected: "{" + pModel + ">" + ci.name + "}", editable: false}));
                        }

                        if (ci.required) {
                            col.getLabel().removeStyleClass("requiredField");
                        }
                    })
            })
        },

        setRowEditMode(pModel) {
            this.getView().getModel(pModel).getData().results.forEach(item => item.Edited = false);

            var oTable = this.byId(pModel + "Tab");

            oTable.getColumns().forEach((col, idx) => {
                this._aColumns[pModel].filter(item => item.label === col.getLabel().getText())
                    .forEach(ci => {
                        if (!ci.hideOnChange && ci.updatable) {
                            if (ci.type === "BOOLEAN") {
                                col.setTemplate(new sap.m.CheckBox({selected: "{" + pModel + ">" + ci.name + "}", editable: true}));
                            }
                            else if (ci.valueHelp["show"]) {
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{" + pModel + ">" + ci.name + "}",
                                    maxLength: +ci.maxLength,
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                    showSuggestion: true,
                                    maxSuggestionWidth: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].maxSuggestionWidth : "1px",
                                    suggestionItems: {
                                        path: ci.valueHelp["items"].path,
                                        length: 1000,
                                        template: new sap.ui.core.ListItem({
                                            key: "{" + ci.valueHelp["items"].value + "}",
                                            text: "{" + ci.valueHelp["items"].value + "}",
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
                                    value: "{path:'" + pModel + ">" + ci.name + "', type:'sap.ui.model.odata.type.Decimal', formatOptions:{ minFractionDigits:" + ci.scale + ", maxFractionDigits:" + ci.scale + " }, constraints:{ precision:" + ci.precision + ", scale:" + ci.scale + " }}",
                                    liveChange: this.onNumberLiveChange.bind(this)
                                }));
                            }
                            else {
                                if (ci.maxLength !== null) {
                                    col.setTemplate(new sap.m.Input({
                                        value: "{" + pModel + ">" + ci.name + "}",
                                        maxLength: +ci.maxLength,
                                        liveChange: this.onInputLiveChange.bind(this)
                                    }));
                                }
                                else {
                                    col.setTemplate(new sap.m.Input({
                                        value: "{" + pModel + ">" + ci.name + "}",
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

        onFilterBySmart(pModel, pFilters, pFilterGlobal, pFilterTab) {
            var oFilter = null;
            var aFilter = [];
            var aFilterGrp = [];
            var aFilterCol = [];

            if (pFilters.length > 0 && pFilters[0].aFilters) {
                console.log("pFilters", pFilters)
                pFilters[0].aFilters.forEach(x => {
                    if (Object.keys(x).includes("aFilters")) {
                        x.aFilters.forEach(y => {
                            console.log("aFilters", y, this._aColumns[pModel])
                            var sName = this._aColumns[pModel].filter(item => item.name.toUpperCase() == y.sPath.toUpperCase())[0].name;
                            aFilter.push(new Filter(sName, FilterOperator.Contains, y.oValue1));

                            //if (!aFilterCol.includes(sName)) aFilterCol.push(sName);
                        });
                        var oFilterGrp = new Filter(aFilter, false);
                        aFilterGrp.push(oFilterGrp);
                        aFilter = [];
                    } else {
                        var sName = this._aColumns[pModel].filter(item => item.name.toUpperCase() == x.sPath.toUpperCase())[0].name;
                        aFilter.push(new Filter(sName, FilterOperator.Contains, x.oValue1));
                        var oFilterGrp = new Filter(aFilter, false);
                        aFilterGrp.push(oFilterGrp);
                        aFilter = [];
                    }
                });
            } else {
                var sName = pFilters[0].sPath;
                aFilter.push(new Filter(sName, FilterOperator.EQ,  pFilters[0].oValue1));
                var oFilterGrp = new Filter(aFilter, false);
                aFilterGrp.push(oFilterGrp);
                aFilter = [];
            }

            if (pFilterGlobal) {
                this._aColumns[pModel].forEach(item => {
                    var sDataType = this._aColumns[pModel].filter(col => col.name === item.name)[0].type;
                    if (sDataType === "Edm.Boolean") aFilter.push(new Filter(item.name, FilterOperator.EQ, pFilterGlobal));
                    else aFilter.push(new Filter(item.name, FilterOperator.Contains, pFilterGlobal));
                })

                var oFilterGrp = new Filter(aFilter, false);
                aFilterGrp.push(oFilterGrp);
                aFilter = [];
            }

            oFilter = new Filter(aFilterGrp, true);

            this.byId(pModel + "Tab").getBinding("rows").filter(oFilter, "Application");

            // Filter by Table columns
            _this.onFilterByCol(pModel, pFilterTab);
        },

        onFilterByCol(pModel, pFilterTab) {
            if (pFilterTab.length > 0) {
                pFilterTab.forEach(item => {
                    var iColIdx = _this._aColumns[pModel].findIndex(x => x.name == item.sPath);
                    _this.getView().byId(pModel + "Tab").filter(_this.getView().byId(pModel + "Tab").getColumns()[iColIdx], 
                        item.oValue1);
                });
            }
        },

        onFilterByGlobal(oEvent) {
            var oTable = oEvent.getSource().oParent.oParent;
            var sTable = oTable.getBindingInfo("rows").model;
            var sQuery = oEvent.getParameter("query");
            var oFilter = null;
            var aFilter = [];

            if (sQuery) {
                this._aFilterableColumns[sTable].forEach(item => {
                    var sDataType = this._aColumns[sTable].filter(col => col.name === item.name)[0].type;
                    if (sDataType === "BOOLEAN") aFilter.push(new Filter(item.name, FilterOperator.EQ, sQuery));
                    else aFilter.push(new Filter(item.name, FilterOperator.Contains, sQuery));
                })

                oFilter = new Filter(aFilter, false);
            }

            this.byId(sTable + "Tab").getBinding("rows").filter(oFilter, "Application");
        },

        clearSortFilter(pTable) {
            var oTable = this.byId(pTable);
            var oColumns = oTable.getColumns();
            for (var i = 0, l = oColumns.length; i < l; i++) {

                if (oColumns[i].getFiltered()) {
                    oColumns[i].filter("");
                }

                if (oColumns[i].getSorted()) {
                    oColumns[i].setSorted(false);
                }
            }
        },
   
        showLoadingDialog(pTitle) {
            if (!_this._LoadingDialog) {
                _this._LoadingDialog = sap.ui.xmlfragment("zuimrp.view.fragments.dialog.LoadingDialog", _this);
                _this.getView().addDependent(_this._LoadingDialog);
            } 
            
            _this._LoadingDialog.setTitle(pTitle);
            _this._LoadingDialog.open();
        },

        closeLoadingDialog() {
            _this._LoadingDialog.close();
        },

        formatDate(pDate) {
            return _sapDateFormat.format(new Date(pDate));
        },

        formatTime(pTime) {
            var time = pTime.split(':');
            let now = new Date();
            return (new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...time)).toLocaleTimeString();
        },

        onAfterTableRendering: function(oEvent) {
            if (this._tableRendered !== "") {
                this.setActiveRowHighlight(this._tableRendered.replace("Tab", ""));
                this._tableRendered = "";
            } 
        },

        onFirstVisibleRowChanged: function (oEvent) {
            var oSource = oEvent.getSource();
            var sModel = oSource.mBindingInfos.rows.model;
            var oTable = oEvent.getSource();

            setTimeout(() => {
                var oData = oTable.getModel(sModel).getData().results;
                var iStartIndex = oTable.getBinding("rows").iLastStartIndex;
                var iLength = oTable.getBinding("rows").iLastLength + iStartIndex;

                if (oTable.getBinding("rows").aIndices.length > 0) {
                    for (var i = iStartIndex; i < iLength; i++) {
                        var iDataIndex = oTable.getBinding("rows").aIndices.filter((fItem, fIndex) => fIndex === i);

                        if (oData[iDataIndex].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                        else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                    }
                }
                else {
                    for (var i = iStartIndex; i < iLength; i++) {
                        if (oData[i].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                        else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                    }
                }
            }, 1);
        },

        onFilter: function(oEvent) {
            var oTable = oEvent.getSource();
            var oSource = oEvent.getSource();
            var sModel = oSource.mBindingInfos.rows.model;

            this.setActiveRowHighlight(sModel);
        },

        onColumnUpdated: function (oEvent) {
            var oSource = oEvent.getSource();
            var sModel = oSource.mBindingInfos.rows.model;

            this.setActiveRowHighlight(sModel);
        },

        setActiveRowHighlight(pModel) {
            var oTable = this.byId(pModel + "Tab");
            
            setTimeout(() => {
                var iActiveRowIndex = oTable.getModel(pModel).getData().results.findIndex(item => item.ACTIVE === "X");

                oTable.getRows().forEach(row => {
                    if (row.getBindingContext(pModel) && +row.getBindingContext(pModel).sPath.replace("/results/", "") === iActiveRowIndex) {
                        row.addStyleClass("activeRow");
                    }
                    else row.removeStyleClass("activeRow");
                })
            }, 1);
        },

        onCellClick: function(oEvent) {
            if (oEvent.getParameters().rowBindingContext) {
                var oTable = oEvent.getSource();
                var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
                var sModel = oEvent.getSource().mBindingInfos.rows.model;

                oTable.getModel(sModel).getData().results.forEach(row => row.ACTIVE = "");
                oTable.getModel(sModel).setProperty(sRowPath + "/ACTIVE", "X"); 
                
                oTable.getRows().forEach(row => {
                    if (row.getBindingContext(sModel) && row.getBindingContext(sModel).sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                        row.addStyleClass("activeRow");
                    }
                    else row.removeStyleClass("activeRow");
                })
            }
        },

        createViewSettingsDialog: function (pType, pProps) {
            var sDialogFragmentName = null;

            if (pType === "sort") sDialogFragmentName = "zuimrp.view.fragments.dialog.SortDialog";
            else if (pType === "filter") sDialogFragmentName = "zuimrp.view.fragments.dialog.FilterDialog";
            else if (pType === "column") sDialogFragmentName = "zuimrp.view.fragments.dialog.ColumnDialog";

            var oViewSettingsDialog = this._oViewSettingsDialog[sDialogFragmentName];

            if (!oViewSettingsDialog) {
                oViewSettingsDialog = sap.ui.xmlfragment(sDialogFragmentName, this);
                
                if (Device.system.desktop) {
                    oViewSettingsDialog.addStyleClass("sapUiSizeCompact");
                }

                oViewSettingsDialog.setModel(pProps);

                this._oViewSettingsDialog[sDialogFragmentName] = oViewSettingsDialog;
                this.getView().addDependent(oViewSettingsDialog);
            }
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
            
            var oDialog = _this._oViewSettingsDialog["zuimrp.view.fragments.dialog.ColumnDialog"];
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
            var oDialog = this._oViewSettingsDialog["zuimrp.view.fragments.dialog.ColumnDialog"];
            var oDialogTable = oDialog.getContent()[0];
            var aSelRows = oDialogTable.getSelectedIndices();

            if (aSelRows.length === 0) {
                oDialog.close();
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
            this._oViewSettingsDialog["zuimrp.view.fragments.dialog.ColumnDialog"].close();
        },

        onSorted: function(oEvent) {
            var sColumnName = oEvent.getParameters().column.getProperty("sortProperty");
            var sSortOrder = oEvent.getParameters().sortOrder;
            var bMultiSort = oEvent.getParameters().columnAdded;
            var oSortData = this._aSortableColumns[oEvent.getSource().getBindingInfo("rows").model];

            if (!bMultiSort) {
                oSortData.forEach(item => {
                    if (item.name === sColumnName) {
                        item.sorted = true;
                        item.sortOrder = sSortOrder;
                    }
                    else {
                        item.sorted = false;
                    } 
                })
            }
        },

        onColSort: function(oEvent) {
            var oTable = oEvent.getSource().oParent.oParent;               
            var aSortableColumns = this._aSortableColumns[oTable.getBindingInfo("rows").model];

            var oDialog = this._oViewSettingsDialog["zuimrp.view.fragments.dialog.SortDialog"];
            oDialog.getModel().setProperty("/table", oTable.getBindingInfo("rows").model);
            oDialog.getModel().setProperty("/items", aSortableColumns);
            oDialog.getModel().setProperty("/rowCount", aSortableColumns.length);
            oDialog.open();
        },

        beforeOpenColSort: function(oEvent) {
            oEvent.getSource().getContent()[0].removeSelectionInterval(0, oEvent.getSource().getModel().getData().items.length - 1);
            oEvent.getSource().getModel().getData().items.forEach(item => {
                if (item.sorted) {                       
                    oEvent.getSource().getContent()[0].addSelectionInterval(item.position, item.position);
                }
            })
        },

        onColSortConfirm: function(oEvent) {
            var oDialog = this._oViewSettingsDialog["zuimrp.view.fragments.dialog.SortDialog"];
            oDialog.close();

            var sTable = oDialog.getModel().getData().table;
            var oTable = this.byId(sTable + "Tab");
            var oDialogData = oDialog.getModel().getData().items;
            var oDialogTable = oDialog.getContent()[0];
            var aSortSelRows = oDialogTable.getSelectedIndices();

            oDialogData.forEach(item => item.sorted = false);

            if (aSortSelRows.length > 0) {
                oDialogData.forEach((item, idx) => {
                    if (aSortSelRows.filter(si => si === idx).length > 0) {
                        var oColumn = oTable.getColumns().filter(col => col.getProperty("sortProperty") === item.name)[0];
                        oTable.sort(oColumn, item.sortOrder === "Ascending" ? SortOrder.Ascending : SortOrder.Descending, true);
                        item.sorted = true;
                    }
                })
            }

            this._aSortableColumns[sTable] = oDialogData;
        },

        onColSortCancel: function(oEvent) {
            this._oViewSettingsDialog["zuimrp.view.fragments.dialog.SortDialog"].close();
        },

        onColFilter: function(oEvent) {
            var oTable = oEvent.getSource().oParent.oParent               
            var aFilterableColumns = this._aFilterableColumns[oTable.getBindingInfo("rows").model];

            var oDialog = this._oViewSettingsDialog["zuimrp.view.fragments.dialog.FilterDialog"];
            oDialog.getModel().setProperty("/table", oTable.getBindingInfo("rows").model);
            oDialog.getModel().setProperty("/items", aFilterableColumns);
            oDialog.getModel().setProperty("/rowCount", aFilterableColumns.length);
            oDialog.open();
        },

        onColFilterConfirm: function(oEvent) {
            var oDialog = this._oViewSettingsDialog["zuimrp.view.fragments.dialog.FilterDialog"];
            oDialog.close();

            var bFilter = false;
            var aFilter = [];
            var oFilter = null;
            var sTable = oDialog.getModel().getData().table;
            var oDialogData = oDialog.getModel().getData().items;

            oDialogData.forEach(item => {
                if (item.value !== "") {
                    bFilter = true;
                    aFilter.push(new Filter(item.name, this.getConnector(item.connector), item.value))
                }
            })
            
            if (bFilter) {
                oFilter = new Filter(aFilter, true);
                this.getView().byId("btnFilterGMC").addStyleClass("activeFiltering");
            }
            else {
                oFilter = "";
                this.getView().byId("btnFilterGMC").removeStyleClass("activeFiltering");
            }

            this.byId(sTable + "Tab").getBinding("rows").filter(oFilter, "Application");
            this._aFilterableColumns[sTable] = oDialogData;
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

        onColFilterCancel: function(oEvent) {
            this._oViewSettingsDialog["zuimrp.view.fragments.dialog.FilterDialog"].close();
        },

        onColSortCellClick: function (oEvent) {
            this._oViewSettingsDialog["zuimrp.view.fragments.dialog.SortDialog"].getModel().setProperty("/activeRow", (oEvent.getParameters().rowIndex));
        },

        onColSortSelectAll: function(oEvent) {
            var oDialog = this._oViewSettingsDialog["zuimrp.view.fragments.dialog.SortDialog"];               
            oDialog.getContent()[0].addSelectionInterval(0, oDialog.getModel().getData().rowCount - 1);
        },

        onColSortDeSelectAll: function(oEvent) {
            var oDialog = this._oViewSettingsDialog["zuimrp.view.fragments.dialog.SortDialog"];               
            oDialog.getContent()[0].removeSelectionInterval(0, oDialog.getModel().getData().rowCount - 1);
        },

        onColSortRowFirst: function(oEvent) {
            var oDialog = this._oViewSettingsDialog["zuimrp.view.fragments.dialog.SortDialog"];
            var iActiveRow = oDialog.getModel().getData().activeRow;

            var oDialogData = this._oViewSettingsDialog["zuimrp.view.fragments.dialog.SortDialog"].getModel().getData().items;
            oDialogData.filter((item, index) => index === iActiveRow)
                .forEach(item => item.position = 0);
            oDialogData.filter((item, index) => index !== iActiveRow)
                .forEach((item, index) => item.position = index + 1);
            oDialogData.sort((a,b) => (a.position > b.position ? 1 : -1));

            oDialog.getModel().setProperty("/items", oDialogData);
            oDialog.getModel().setProperty("/activeRow", iActiveRow - 1);
        },

        onColSortRowUp: function(oEvent) {
            var oDialog = this._oViewSettingsDialog["zuimrp.view.fragments.dialog.SortDialog"];
            var iActiveRow = oDialog.getModel().getData().activeRow;

            var oDialogData = oDialog.getModel().getData().items;
            oDialogData.filter((item, index) => index === iActiveRow).forEach(item => item.position = iActiveRow - 1);
            oDialogData.filter((item, index) => index === iActiveRow - 1).forEach(item => item.position = item.position + 1);
            oDialogData.sort((a,b) => (a.position > b.position ? 1 : -1));

            oDialog.getModel().setProperty("/items", oDialogData);
            oDialog.getModel().setProperty("/activeRow", iActiveRow - 1);
        },

        onColSortRowDown: function(oEvent) {
            var oDialog = this._oViewSettingsDialog["zuimrp.view.fragments.dialog.SortDialog"];
            var iActiveRow = oDialog.getModel().getData().activeRow;

            var oDialogData = oDialog.getModel().getData().items;
            oDialogData.filter((item, index) => index === iActiveRow).forEach(item => item.position = iActiveRow + 1);
            oDialogData.filter((item, index) => index === iActiveRow + 1).forEach(item => item.position = item.position - 1);
            oDialogData.sort((a,b) => (a.position > b.position ? 1 : -1));

            oDialog.getModel().setProperty("/items", oDialogData);
            oDialog.getModel().setProperty("/activeRow", iActiveRow + 1);
        },

        onColSortRowLast: function(oEvent) {
            var oDialog = this._oViewSettingsDialog["zuimrp.view.fragments.dialog.SortDialog"];
            var iActiveRow = oDialog.getModel().getData().activeRow;

            var oDialogData = oDialog.getModel().getData().items;
            oDialogData.filter((item, index) => index === iActiveRow)
                .forEach(item => item.position = oDialogData.length - 1);
                oDialogData.filter((item, index) => index !== iActiveRow)
                .forEach((item, index) => item.position = index);
                oDialogData.sort((a,b) => (a.position > b.position ? 1 : -1));

            oDialog.getModel().setProperty("/items", oDialogData);
            oDialog.getModel().setProperty("/activeRow", iActiveRow - 1);
        },

        onColPropSelectAll: function(oEvent) {
            var oDialog = this._oViewSettingsDialog["zuimrp.view.fragments.dialog.ColumnDialog"];               
            oDialog.getContent()[0].addSelectionInterval(0, oDialog.getModel().getData().rowCount - 1);
        },

        onColPropDeSelectAll: function(oEvent) {
            var oDialog = this._oViewSettingsDialog["zuimrp.view.fragments.dialog.ColumnDialog"];               
            oDialog.getContent()[0].removeSelectionInterval(0, oDialog.getModel().getData().rowCount - 1);
        },
    });
   
  });