// index.js
prototypeExtensions();

function prototypeExtensions() {
// extend the base objects for missing methods that are usefull everywhere.

    // http://stackoverflow.com/questions/202605/repeat-string-javascript
    String.prototype.repeat = function(num)
    {
        return new Array(num + 1).join(this);
    };
    // http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
    // example: "{0} is dead, but {1} is alive! {0} {2}".format("ASP", "ASP.NET")
    // first, checks if it isn't implemented yet
    if (!String.prototype.format) {
        String.prototype.format = function() {
            var args = arguments;
            return this.replace(/{(\d+)}/g, function(match, number) {
                return typeof args[number] != 'undefined'
                        ? args[number]
                        : match
                        ;
            });
        };
    }
    // http://stackoverflow.com/questions/646628/javascript-startswith
    if (typeof String.prototype.startsWith != 'function') {
        String.prototype.startsWith = function(str) {
            return this.slice(0, str.length) == str;
        };
    }

    if (typeof String.prototype.endsWith != 'function') {
        String.prototype.endsWith = function(str) {
            return this.slice(-str.length) == str;
        };
    }
}
/*
 *
 European Commission IC-36 group of currencies (European Union 27 Member States, i.e.
 BE, DE, EE, GR, ES, FR, IE, IT, CY, LU, NL, MT, AT, PT, SI, SK, FI, BG, CZ, DK, LV, LT, HU, PL, RO, SE, GB,
 and US, AU, CA, JP, MX, NZ, NO, CH, TR)

 */
var eu_states = ['BE', 'BG', 'CZ', 'DK', 'DE', 'EE', 'IE', 'EL', 'ES', 'FR', 'GB', 'GR', 'IT', 'CY', 'LV', 'LT', 'LU', 'HU', 'MT', 'NL', 'AT', 'PL', 'PT', 'RO', 'SI', 'SK', 'FI', 'SE', 'UK'];

function stored_setup() {
    var queryOptions = {};

    if (dojo.byId('optionLatestData').checked) {
        queryOptions.latestData = true;
    }
    queryOptions.titleAdd = '';
    var ds, de;

    ds = dijit.byId('StartTime').get('value');
    de = dijit.byId('EndTime').get('value');
    if (ds && de)
    {
        queryOptions.startTime = dojo.date.locale.format(ds, {datePattern: 'yyyy-MM-dd', selector: "date"});
        queryOptions.endTime = dojo.date.locale.format(de, {datePattern: 'yyyy-MM-dd', selector: "date"});
        queryOptions.titleAdd = ' {0} to {1}'.format(queryOptions.startTime, queryOptions.endTime);
    }
    else {
        queryOptions.startTime = "2000-03-01";
        queryOptions.endTime = "2013-03-01";
    }
    return queryOptions;
}

function call_query_example(methodOptions) {
    var queryOptions = stored_setup();
    var cpi_by_country = {
        qAnd: [
            {component: "FREQ", value: "M"},
            {component: "ICP_ITEM", value: "000000"},
            {component: "STS_INSTITUTION", value: "4"},
            {component: "ICP_SUFFIX", value: "ANR"}],
        qOr: [],
        startTime: queryOptions.startTime,
        endTime: queryOptions.endTime,
        dataSetId: "2034476"};
    for (e in eu_states) {
        cpi_by_country.qOr.push({component: 'REF_AREA', value: eu_states[e]});
    }
    var encoded = encodeURIComponent(JSON.stringify(cpi_by_country));
    var title = encodeURIComponent('Quarterly CPI all EU states' + queryOptions.titleAdd);

    var queryOptionsParameter = encodeURIComponent(JSON.stringify(queryOptions));
    if (methodOptions && methodOptions.map) {


        location.href = '{3}?mapResult.html&title={0}&query={1}&options={2}'.format(title, encoded, queryOptionsParameter, getRpage());
    }
    else
        location.href = '{3}?queryResult.html&title={0}&query={1}&options={2}'.format(title, encoded, queryOptionsParameter, getRpage());
}

function requestCompleted() {
    // this does nothing so far
    var reset = function() {
    };
    setTimeout(reset, 2000);
}

function expandCollapseCategory(evt) {
    // method for handling expand and collapse of <li> elements
    // show all next hierachy level contained in this <ul> element
    var ul = this;
    var className = ul.className;

    var level = parseInt(className[className.length - 1]);
    var nextClass = className.replace(level, level + 1);
    var children = dojo.query('> li .' + nextClass, ul);
    console.log('expandCollapseCategory', className, nextClass, children.length);
    for (z = 0; z < children.length; z++) {
        var c = children[z];
        c.classList.toggle('categorySchemeHidden');
    }
    // if next child is hidden then expand it
    // if next child is shown the hide it and all children
}

function getCategorySchemeResponse(xmlhttp) {
    // processes the XML for all the category schemes
    dojo.byId("status").innerHTML = "Formatting results...";
    dojo.style(dojo.byId('content'), "display", "none");
    dojo.byId('content').innerHTML = xmlhttp.responseText;
    var div = dojo.byId('concepts');

    div.innerHTML = '';
    var s = '';
    var contentHandler = new DefaultHandler2();
    var categoryId = '';
    var currentName = '';
    var categoryCount = 0;
    var categorySchemeDepth = 0;

    /*
     <ns12:Category id="6513466">
     <ns12:Name>ECB non-energy commodity prices</ns12:Name>
     <ns12:DataflowRef>
     <ns12:AgencyID>ECB</ns12:AgencyID>
     <ns12:DataflowID>6413551</ns12:DataflowID>
     <ns12:Version>1.0</ns12:Version>
     </ns12:DataflowRef>
     </ns12:Category>
     */
    var hiddenClass = '';

    var saxParser = XMLReaderFactory.createXMLReader();
    contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
        //console.log( "startElement : [" + namespaceURI + "], [" + localName + "], [" + qName + "]" );
        currentName = localName;

        if (localName == 'Category') {
            categorySchemeDepth += 1;
            if (categorySchemeDepth == 2)
                hiddenClass = 'categorySchemeHidden ';
            else
                hiddenClass = '';
            categoryId = atts.getValue(atts.getIndex('id'));
            //s += '<div class="imgClosed">+</div>
            s += '<ul class="' + hiddenClass + 'categorySchemeDepth' + categorySchemeDepth + '">';
        }

        if (localName == 'Name' && categoryId.length > 0) {
            s += '<li>' + categoryId;
        }
    };
    contentHandler.endElement = function(namespaceURI, localName, qName) {
        //console.log( "startElement : [" + namespaceURI + "], [" + localName + "], [" + qName + "]" );
        currentName = localName;
        if (localName == 'Category') {
            categoryCount++;
            categorySchemeDepth -= 1;
            s += '</li></ul>';
        }
    };
    contentHandler.characters = function(ch, start, ch_length) {
        //console.log( "characters : [" + ch + "], [" + start + "], [" + ch_length + "]" );
        if (currentName == 'Name' && categoryId.length > 0) {
            s += ' ' + ch;
            categoryId = '';
        }

        if (currentName == 'DataflowID') {
            s += '&nbsp;<a href="{0}?dataflow.html&objectid={1}">Data {1}</a>'.format(getRpage(), ch);
        }
    };
    try {

        saxParser.setHandler(contentHandler);
        saxParser.parseString(xmlhttp.responseText);

    } catch (e) {
        alert('problem processing response:' + e.message);
        dojo.style(dojo.byId('content'), "display", "block");
    }

    if (categoryCount == 0)
    {
        s = '<p>No categories found</p>';
    }
    div.innerHTML = s;
    dojo.byId("status").innerHTML = "Done";
    dojo.query(".categorySchemeDepth1").connect("onclick", expandCollapseCategory);
}

function call_GetCategoryScheme_ws() {
    dojo.byId('content').value = '';

    var soap = '<in><quer:AgencyID>ECB</quer:AgencyID><quer:ID>SDW_ECONOMIC_CONCEPTS</quer:ID></in>';

    call_ecb_sdmx_ws(soap, 'GetCategoryScheme', 'content', getCategorySchemeResponse);
}

var responseStartsWithCheck = '<message:';// sanity check for messages

function call_ecb_sdmx_ws(ws_query, method, responseId, xml_method, query) {
    var cacheKey = method + JSON.stringify(ws_query);
    var s = recallJSON(cacheKey);
    if (s) {
        console.log('ws local cache ' + method);
        if (!s.indexOf(method + 'Response')) {
            // remove the cache entry
            console.log('Cache entry has incorrect format.  Does not contain "{0}"'.format(method + 'Response'));
            localStorage.removeItem(cacheKey);
        }
        else {
            var xmlhttp = {};

            xmlhttp.responseText = s;
            xml_method(xmlhttp, query);
            return;
        }
    }
    var xmlhttp = new XMLHttpRequest();
    var url = 'http://sdw-ws.ecb.europa.eu/services/SDMXQuery';
    var proxy_url = '{0}?{1}'.format(getProxyPage(), url);

    console.log('calling:' + proxy_url);
    xmlhttp.open('POST', proxy_url, true);
    var ws_header = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" \
xmlns:web1="http://webservices.sdw.ecb/" \
xmlns:quer="http://www.SDMX.org/resources/SDMXML/schemas/v2_0/query">\
<soapenv:Header/>\
	<soapenv:Body>';
    var ws_footer = '</soapenv:Body></soapenv:Envelope>';
    var ws_method_header = '<web1:' + method + '>';

    var ws_method_footer = '</web1:' + method + '>';
    var soapBody = ws_header + ws_method_header + ws_query + ws_method_footer + ws_footer;
    // build SOAP request

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4) {
            if (xmlhttp.status == 200) {
                console.log('soap packet ready');
                if (responseId) {
                    var responseControl = dojo.byId(responseId);
                    if (responseControl)
                        responseControl.value = xmlhttp.responseText;
                }
                storeJSON(cacheKey, xmlhttp.responseText);
                xml_method(xmlhttp, query);
            }
            else
            {
                var errorText = xmlhttp.status + ' ERROR:' + xmlhttp.responseText;
                if (responseId)
                    dojo.byId(responseId).value = errorText;
                console.log(errorText);
            }
        }
    };

    // Send the POST request
    xmlhttp.setRequestHeader('Content-Type', 'text/xml; charset=utf-8');
    xmlhttp.setRequestHeader('SOAPAction', 'http://stats.oecd.org/OECDStatWS/SDMX/' + method);
    console.log('soap:' + soapBody);
    xmlhttp.send(soapBody);
    requestCompleted();
}

function call_ecb_sdmx_ws_sync(ws_query, method) {
    // returns the xmlhttp object from the query
    var xmlhttp = new XMLHttpRequest();
    var url = 'http://sdw-ws.ecb.europa.eu/services/SDMXQuery';
    var proxy_url = '{0}?{1}'.format(getProxyPage(), url);

    console.log('POST:' + proxy_url);
    xmlhttp.open('POST', proxy_url, false);
    // build SOAP request
    var ws_header = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" \
xmlns:web1="http://webservices.sdw.ecb/" \
xmlns:quer="http://www.SDMX.org/resources/SDMXML/schemas/v2_0/query">\
<soapenv:Header/>\
	<soapenv:Body>';
    var ws_footer = '</soapenv:Body></soapenv:Envelope>';
    var ws_method_header = '<web1:' + method + '>';

    var ws_method_footer = '</web1:' + method + '>';
    var soapBody = ws_header + ws_method_header + ws_query + ws_method_footer + ws_footer;
    // Send the POST request
    xmlhttp.setRequestHeader('Content-Type', 'text/xml; charset=utf-8');
    xmlhttp.setRequestHeader('SOAPAction', 'http://stats.oecd.org/OECDStatWS/SDMX/' + method);
    console.log('send:' + soapBody);
    xmlhttp.send(soapBody);
    if (xmlhttp.readyState == 4) {
        if (xmlhttp.status == 200) {
            console.log('soap packet ready');
        }
        else
        {
            var errorText = xmlhttp.status + ' ERROR:' + xmlhttp.responseText;
            console.log(errorText);
        }
    }
    return xmlhttp;
}

function clearLocalStorage() {
    localStorage.clear();
    alert('local storage cleared');
    init_localStorage();
}

function deleteLocalStorageEntry() {
    var grid = dijit.byId('localStorageTable');
    var store = grid.store;
    var itemsToDelete = [];
    // Returns query results from the array that match the given query

    function gotItems(items, request) {
        var i;
        for (i = 0; i < items.length; i++) {
            var item = items[i];
            itemsToDelete.push(store.getValue(item, "key"));
        }
    }

    store.fetch({query: {select: true}, onComplete: gotItems});

    for (var z in itemsToDelete) {
        localStorage.removeItem(itemsToDelete[z]);
    }

    localStorageSetStore(grid);
}
/**
 * Comment
 */
function localStorageSetStore(grid) {
    var localItems = [];

    var count = 0, bytes = 0;
    for (var z in localStorage) {
        localItems.push({index: count, size: localStorage[z].length, key: z, query: localStorage[z]});
        count++;
        bytes += localStorage[z].length;
    }

    var store = new dojo.data.ItemFileWriteStore({data: {items: localItems}});
    grid.setStore(store);
    dojo.byId('foundCount').innerHTML = "found {0}, {1} megabytes used.".format(count, Math.round(bytes / (1024 * 1024)));
}

function viewLocalStorageEntry(entryKey) {
    var item = recallJSON(entryKey);

    myDialog = new dijit.Dialog({
        title: "Query Content",
        content: item.toString(),
        style: "width: 60%, height 50%"
    });
    myDialog.show();

}

function init_localStorage() {
    var grid = new dojox.grid.DataGrid({
        structure: [
            {name: "Size", field: "size", width: "10%"},
            {name: "Select", field: "select", editable: true, cellType: dojox.grid.cells.Bool, width: "5%"},
            {name: "Key - Click to Show", field: "key", width: "85%"}
        ], autoHeight: true
    }, "localStorageTable"
            );
    grid.startup();

    grid.on("RowClick", function(evt) {
        var idx = evt.rowIndex,
                rowData = grid.getItem(idx);
        if (evt.cell.field == 'key') {
            viewLocalStorageEntry(rowData.key);
        }
    }, true);

    localStorageSetStore(grid);

}

/*
 * passenger car sales
 * {"qAnd":[{"component":"FREQ","value":"M"},{"component":"ADJUSTMENT","value":"Y"},{"component":"STS_CLASS","value":"PC0000"},{"component":"STS_SUFFIX","value":"ABS"}],"qOr":[{"component":"REF_AREA","value":"AT"},{"component":"REF_AREA","value":"BE"},{"component":"REF_AREA","value":"BG"},{"component":"REF_AREA","value":"CH"},{"component":"REF_AREA","value":"CZ"},{"component":"REF_AREA","value":"DE"},{"component":"REF_AREA","value":"DK"},{"component":"REF_AREA","value":"EE"},{"component":"REF_AREA","value":"ES"},{"component":"REF_AREA","value":"FI"},{"component":"REF_AREA","value":"FR"},{"component":"REF_AREA","value":"GB"},{"component":"REF_AREA","value":"GR"},{"component":"REF_AREA","value":"HU"},{"component":"REF_AREA","value":"IE"},{"component":"REF_AREA","value":"IT"},{"component":"REF_AREA","value":"LT"},{"component":"REF_AREA","value":"LU"},{"component":"REF_AREA","value":"LV"},{"component":"REF_AREA","value":"NL"},{"component":"REF_AREA","value":"NO"},{"component":"REF_AREA","value":"PL"},{"component":"REF_AREA","value":"PT"},{"component":"REF_AREA","value":"RO"},{"component":"REF_AREA","value":"SE"},{"component":"REF_AREA","value":"SI"},{"component":"REF_AREA","value":"SK"}],"startTime":"","endTime":"","dataSetId":"2136627"}
 */

function showHomeGrid() {
    // show the query that is currently selected.
    var grid = dijit.byId('grid');

    var items = grid.selection.getSelected();

    if (items.length) {
        showQuery(items[0].filename[0]);
    }
    else {
        alert('No query selected');
    }
}

function init_home() {
    var grid = new dojox.grid.DataGrid({
        structure: [
            {name: "Name", field: "name", width: "20%"},
            {name: "Dataset Title - Double Click to Show", field: "title", width: "50%"}
        ]
    }, "grid"
            );
    grid.startup();
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', 'query.php?method=list', false);
    xmlhttp.send();
    try {
        var queries = JSON.parse(xmlhttp.responseText);
    } catch (e) {
        alert('Error processing JSON reply ' + e.message);
    }

    var store = new dojo.data.ItemFileWriteStore({data: {items: queries.queries}});
    grid.setStore(store);
    grid.on("RowDblClick", function(evt) {
        var idx = evt.rowIndex;
        var rowData = grid.getItem(idx);
        showQuery(rowData.filename[0]);

    }, true);
}
