/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

var grid;

function setup_dataflow_grid(gridNumber) {
	var grid = new dojox.grid.DataGrid({
		structure: [
			{name: "Constraint", field: "constraint", width: "20%"},
			{name: "Code List", field: "component", width: "20%"},
			{name: "Value", field: "value", width: "20%"},
			{name: "And", field: "qAnd", editable: true, cellType: dojox.grid.cells.Bool, width: "10%"},
			{name: "Or", field: "qOr", editable: true, cellType: dojox.grid.cells.Bool, width: "10%"}
		]
	}, "grid{0}".format(gridNumber)
			);
	grid.startup();
	// setup the tool tips by reading the code lists from the key family
	var showTooltip = function(e) {
		//console.log("showTooltip");
		var msg;
		if (e.rowIndex >= 0) { // header is <0
			if (e.cell.field == 'value') {
				// value column of constraints
				var item = e.grid.getItem(e.rowIndex);
				var code = e.grid.store.getValue(item, e.cell.field);
				var concept = item.component[0];
				var codelist;
				for (z in e.grid.keyFamilyData.dimensions) {
					// find the concept map to the code list
					if (concept == e.grid.keyFamilyData.dimensions[z].concept) {
						codelist = e.grid.keyFamilyData.dimensions[z].codelist;
						break;
					}
				}

				if (codelist) {
					// find the text in the keyFamilyData
					var codeLists = e.grid.keyFamilyData.codeLists;
					for (z in codeLists) {
						//find right code list
						if (codeLists[z].code == codelist) {
							//find code in codelist
							for (c in codeLists[z].codes) {
								if (codeLists[z].codes[c].code == code) {
									msg = '{0} - {1}'.format(codeLists[z].name, codeLists[z].codes[c].description);
									break;
								}
							}
						}
						if (msg) {
							break;
						}
					}
				}
			}
		}
		;
		if (msg) {
			//console.log(msg);
			dijit.showTooltip(msg, e.cellNode);
			//dijit.showTooltip(msg, e.cellNode, ["below", "above", "after", "before"]);
		}
	};
	var hideTooltip = function(e) {
		dijit.hideTooltip(e.cellNode);
	};
	dojo.connect(grid, "onCellMouseOver", showTooltip);
	dojo.connect(grid, "onCellMouseOut", hideTooltip);
	dojo.connect(grid, "onHeaderCellMouseOver", showTooltip);
	dojo.connect(grid, "onHeaderCellMouseOut", hideTooltip);
	return grid;
}


function call_dataflow_ws(dataflowCount) {
	dojo.byId('content').value = '';
	var dataflowid = dojo.byId('objectid{0}'.format(dataflowCount)).value;
	var soap = '<in><quer:AgencyID>ECB</quer:AgencyID><quer:ID>' + dataflowid + '</quer:ID></in>';
	call_ecb_sdmx_ws(soap, 'GetDataflow', 'content', getDataflowResponse, dataflowCount);
}


function getDataflowResponse(xmlhttp, dataflowCount) {
// processes the XML for all the dataflow schemes
//dojo.byId("status").innerHTML = "Formatting results...";
	var div = dojo.byId('keyFamilyLinks{0}'.format(dataflowCount));
	var grid = dijit.byId('grid{0}'.format(dataflowCount));
	var s = '&nbsp;';
	var contentHandler = new DefaultHandler2();
	var id = '';
	var currentName = '';
	var foundCount = 0;
	var elements = Array();
	var data = [];
	var keyFamilyId = '';
	var breakValues = [];
	/*
	 <?xml version='1.0' encoding='UTF-8'?>
	 <S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
	 <S:Body>      <ns3:GetDataflowResponse xmlns:ns2="http://www.SDMX.org/resources/SDMXML/schemas/v2_0/query" xmlns:ns3="http://webservices.sdw.ecb/" xmlns:ns4="http://www.SDMX.org/resources/SDMXML/schemas/v2_0/message" xmlns:ns5="http://www.SDMX.org/resources/SDMXML/schemas/v2_0/metadatareport" xmlns:ns6="http://www.SDMX.org/resources/SDMXML/schemas/v2_0/cross" xmlns:ns7="http://www.SDMX.org/resources/SDMXML/schemas/v2_0/genericmetadata" xmlns:ns8="http://www.SDMX.org/resources/SDMXML/schemas/v2_0/common" xmlns:ns9="http://www.SDMX.org/resources/SDMXML/schemas/v2_0/generic" xmlns:ns10="http://www.SDMX.org/resources/SDMXML/schemas/v2_0/compact" xmlns:ns11="http://www.SDMX.org/resources/SDMXML/schemas/v2_0/utility" xmlns:ns12="http://www.SDMX.org/resources/SDMXML/schemas/v2_0/structure" xmlns:ns13="http://www.SDMX.org/resources/SDMXML/schemas/v2_0/registry">
	 <out>
	 <ns4:Structure>
	 <ns4:Header>
	 <ns4:ID>d0ab0d52-5eb0-4bb3-b6eb-921ebbc96133</ns4:ID>
	 <ns4:Test>false</ns4:Test>
	 <ns4:Prepared>2013-02-21T01:21:33+01:00</ns4:Prepared>
	 <ns4:Sender id="ECB">
	 <ns4:Name>European Central Bank</ns4:Name>
	 <ns4:Contact>
	 <ns4:Email>statistics@ecb.europa.eu</ns4:Email>
	 </ns4:Contact>
	 </ns4:Sender>
	 </ns4:Header>
	 <ns4:Dataflows>
	 <ns12:Dataflow isFinal="true" agencyID="ECB" version="1.0" id="2136672">
	 <ns12:Name>Financial market data - Key ECB interest rates</ns12:Name>
	 <ns12:KeyFamilyRef>
	 <ns12:KeyFamilyID>ECB_FMD2</ns12:KeyFamilyID>
	 <ns12:KeyFamilyAgencyID>ECB</ns12:KeyFamilyAgencyID>
	 <ns12:Version>1.0</ns12:Version>
	 </ns12:KeyFamilyRef>
	 <ns12:CategoryRef>
	 <ns12:CategorySchemeID>SDW_ECONOMIC_CONCEPTS</ns12:CategorySchemeID>
	 <ns12:CategorySchemeAgencyID>ECB</ns12:CategorySchemeAgencyID>
	 <ns12:CategorySchemeVersion>1.0</ns12:CategorySchemeVersion>
	 <ns12:ID>2018801</ns12:ID>
	 </ns12:CategoryID>
	 </ns12:CategoryRef>
	 <ns12:Constraint ConstraintType="Content">
	 <ns8:ConstraintID>ECB_FMD2-CONSTRAINT</ns8:ConstraintID>
	 <ns8:CubeRegion isIncluded="true">
	 <ns8:Member isIncluded="true">
	 <ns8:ComponentRef>FREQ</ns8:ComponentRef>
	 <ns8:MemberValue>
	 <ns8:Value>B</ns8:Value>
	 </ns8:MemberValue>
	 </ns8:Member>
	 <ns8:Member isIncluded="true">
	 <ns8:ComponentRef>REF_AREA</ns8:ComponentRef>
	 <ns8:MemberValue>
	 <ns8:Value>U2</ns8:Value>
	 </ns8:MemberValue>
	 </ns8:Member>
	 <ns8:Member isIncluded="true">
	 <ns8:ComponentRef>CURRENCY</ns8:ComponentRef>
	 <ns8:MemberValue>
	 <ns8:Value>EUR</ns8:Value>
	 </ns8:MemberValue>
	 </ns8:Member>
	 <ns8:Member isIncluded="true">
	 <ns8:ComponentRef>PROVIDER_FM</ns8:ComponentRef>
	 <ns8:MemberValue>
	 <ns8:Value>4F</ns8:Value>
	 </ns8:MemberValue>
	 </ns8:Member>
	 <ns8:Member isIncluded="true">
	 <ns8:ComponentRef>INSTRUMENT_FM</ns8:ComponentRef>
	 <ns8:MemberValue>
	 <ns8:Value>KR</ns8:Value>
	 </ns8:MemberValue>
	 </ns8:Member>
	 <ns8:Member isIncluded="true">
	 <ns8:ComponentRef>PROVIDER_FM_ID</ns8:ComponentRef>
	 <ns8:MemberValue>
	 <ns8:Value>DFR</ns8:Value>
	 </ns8:MemberValue>
	 <ns8:MemberValue>
	 <ns8:Value>MLFR</ns8:Value>
	 </ns8:MemberValue>
	 <ns8:MemberValue>
	 <ns8:Value>MRR_FR</ns8:Value>
	 </ns8:MemberValue>
	 <ns8:MemberValue>
	 <ns8:Value>MRR_MBR</ns8:Value>
	 </ns8:MemberValue>
	 </ns8:Member>
	 <ns8:Member isIncluded="true">
	 <ns8:ComponentRef>DATA_TYPE_FM</ns8:ComponentRef>
	 <ns8:MemberValue>
	 <ns8:Value>CHG</ns8:Value>
	 </ns8:MemberValue>
	 <ns8:MemberValue>
	 <ns8:Value>LEV</ns8:Value>
	 </ns8:MemberValue>
	 </ns8:Member>
	 </ns8:CubeRegion>
	 </ns12:Constraint>
	 </ns12:Dataflow>
	 </ns4:Dataflows>
	 </ns4:Structure>
	 </out>
	 </ns3:GetDataflowResponse>
	 </S:Body>
	 </S:Envelope>
	 */
	var codeList = '', constaint = '';
	var saxParser = XMLReaderFactory.createXMLReader();
	contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
//console.log( "startElement : [" + namespaceURI + "], [" + localName + "], [" + qName + "]" );
		currentName = localName;
		elements.push(localName);
		switch (localName) {
			case 'Dataflow':
				id = atts.getValue(atts.getIndex('id'));
				break;
			case 'KeyFamilyRef':
				s += 'Key family reference';
				break;
		}
	};
	contentHandler.endElement = function(namespaceURI, localName, qName) {
//console.log( "startElement : [" + namespaceURI + "], [" + localName + "], [" + qName + "]" );
		currentName = localName;
		var leavingElement = elements.pop();
		switch (localName) {
			case 'Dataflow':
				foundCount++;
				break;
			case 'KeyFamilyRef':
				break;
		}
	};
	contentHandler.characters = function(ch, start, ch_length) {
//console.log( "characters : [" + ch + "], [" + start + "], [" + ch_length + "]" );
		switch (currentName) {
			case 'Name':
				dojo.byId('dataFlowTitle{0}'.format(dataflowCount)).innerHTML = '{0} {1}'.format(id, ch);
				break;
			case'KeyFamilyID':
				keyFamilyId = ch;
				s += '&nbsp;<a href="{0}?KeyFamily.html&objectid={1}">{1}</a> '.format(getRpage(), ch);
				break;
			case 'ConstraintID':
				constraint = ch;
				break;
			case 'CategorySchemeID':
				s += '<strong>{0}</strong>'.format(ch);
				break;
			case 'ComponentRef':
				if (elements.indexOf('Constraint') > -1)
					codeList = ch;
				break;
			case 'Value':
				if (elements.indexOf('Member') > -1 && elements.indexOf('MemberValue') > -1) {
					data.push({constraint: constraint, component: codeList, value: ch, qAnd: false, qOr: false});
					if (breakValues.indexOf(codeList) == -1) {
// add all unique values to be used as the break values for
// determining chart series
						breakValues.push(codeList);
					}
				}
				break;
		}
	};
	try {

		saxParser.setHandler(contentHandler);
		saxParser.parseString(xmlhttp.responseText);
	} catch (e) {
		alert('problem processing response:' + e.message);
		dojo.style(dojo.byId('content'), "display", "block");
		dojo.byId('content').focus();
		return;
	}

	if (foundCount == 0)
		s = '<p>No results found</p>';
	// http://dojo-toolkit.33424.n3.nabble.com/how-to-change-ItemFileWriteStore-data-or-dojox-grid-DataGrid-td2353208.html
	var store = new dojo.data.ItemFileWriteStore({data: {items: data}});
	grid.setStore(store);
	var keyFamilyData = getKeyfamily(keyFamilyId);
	grid.keyFamilyData = keyFamilyData;
	//console.log( s );
	div.innerHTML = s; // key family href
	if (!dijit.byId('breakField')) {
		var storeValues = [];
		for (z in breakValues) {
			storeValues.push({label: breakValues[z], id: breakValues[z]});
		}
		var breakStore = new dojo.store.Memory({
			data: storeValues
		});
		var defaultBreakField = breakValues.indexOf("REF_AREA") >= 0 ? "REF_AREA" : breakValues[0];
		var select = new dijit.form.Select({
			id: "breakField",
			label: defaultBreakField,
			value: defaultBreakField,
			store: new dojo.data.ObjectStore({objectStore: breakStore}),
			searchAttr: "name"}, "breakField");
		select.startup();
	}     //dojo.byId("status").innerHTML = "Done";
	dojo.style(dojo.byId('executing'), 'display', 'none');
}
