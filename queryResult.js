// queries
// requires
dojo.require("dojox.charting.Chart");
dojo.require("dojox.charting.Chart2D");
dojo.require("dojox.charting.axis2d.Default");
dojo.require("dojox.charting.plot2d.Lines");
dojo.require("dojox.charting.widget.SelectableLegend");
dojo.require("dojox.charting.themes.Claro");
dojo.require('dojox.charting.action2d.Tooltip');
dojo.require("dojox.charting.action2d.Magnify");
dojo.require("dijit.form.HorizontalSlider");
dojo.require('dijit.form.HorizontalRule');
dojo.require('dijit.form.HorizontalRuleLabels');
//var sdmxData = {};
var queryOptions = {};
var sdmxDataList = [];
function parseQueryDataResponse(xmlhttp, breakValue) {
    /*
     <ns9:DataSet action="Replace" keyFamilyURI="http://sdw-ws.ecb.europa.eu/KeyFamily/ECB_EXR1">
     <ns9:KeyFamilyRef>ECB_EXR1</ns9:KeyFamilyRef>
     <ns9:Group type="Group">
     <ns9:GroupKey>
     <ns9:Value value="AUD" concept="CURRENCY"/>
     <ns9:Value value="EUR" concept="CURRENCY_DENOM"/>
     <ns9:Value value="SP00" concept="EXR_TYPE"/>
     <ns9:Value value="A" concept="EXR_SUFFIX"/>
     </ns9:GroupKey>
     <ns9:Attributes>
     <ns9:Value value="4" concept="DECIMALS"/>
     <ns9:Value value="0" concept="UNIT_MULT"/>
     <ns9:Value value="AUD" concept="UNIT"/>
     <ns9:Value value="ECB reference exchange rate, Australian dollar/Euro, 2:15 pm (C.E.T.)" concept="TITLE_COMPL"/>
     <ns9:Value value="4F0" concept="SOURCE_AGENCY"/>
     </ns9:Attributes>
     <ns9:Series>
     <ns9:SeriesKey>
     <ns9:Value value="Q" concept="FREQ"/>
     <ns9:Value value="AUD" concept="CURRENCY"/>
     <ns9:Value value="EUR" concept="CURRENCY_DENOM"/>
     <ns9:Value value="SP00" concept="EXR_TYPE"/>
     <ns9:Value value="A" concept="EXR_SUFFIX"/>
     </ns9:SeriesKey>
     <ns9:Attributes>
     <ns9:Value value="MOB.T0802" concept="PUBL_PUBLIC"/>
     <ns9:Value value="A" concept="COLLECTION"/>
     <ns9:Value value="P3M" concept="TIME_FORMAT"/>
     </ns9:Attributes>
     <ns9:Obs>
     <ns9:Time>1999-Q1</ns9:Time>
     <ns9:ObsValue value="1.7699"/>
     <ns9:Attributes>
     <ns9:Value value="A" concept="OBS_STATUS"/>
     </ns9:Attributes>
     </ns9:Obs>
     <ns9:Obs>
     <ns9:Time>1999-Q2</ns9:Time>
     <ns9:ObsValue value="1.618"/>
     <ns9:Attributes>
     <ns9:Value value="A" concept="OBS_STATUS"/>
     </ns9:Attributes>
     </ns9:Obs>

     */

    var contentHandler = new DefaultHandler2();
    var series_vals = {}, vals = {};
    var columns = ['Time', 'Value'];
    var column_descriptions = ['Time period', 'Observation Value'];
    var elements = [];
    var columnsFound = false;
    var time_period = '', obs_value = '', currentName, previousName, last_time_period = '';
    var latestData = []; // holds the last obeservation for each REF_AREA (breakField)

    var saxParser = XMLReaderFactory.createXMLReader();
    var sdmxData = {};
    var data = [];
    sdmxData.data = data;
    contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
        //console.log( "startElement : [" + namespaceURI + "], [" + localName + "], [" + qName + "]" );
        /*
         These are the query table column + OBS_VALUE
         <ns9:SeriesKey>
         <ns9:Value value="A" concept="FREQ"/>
         <ns9:Value value="I6" concept="REF_AREA"/>
         <ns9:Value value="N" concept="ADJUSTMENT"/>
         <ns9:Value value="5" concept="DATA_TYPE_BOP"/>
         <ns9:Value value="988D" concept="BOP_ITEM"/>
         <ns9:Value value="N" concept="CURR_BRKDWN"/>
         <ns9:Value value="A1" concept="COUNT_AREA"/>
         <ns9:Value value="E" concept="SERIES_DENOM"/>

         <ns9:Obs>
         <ns9:Time>1999-Q2</ns9:Time>
         <ns9:ObsValue value="1.618"/>
         <ns9:Attributes>
         <ns9:Value value="A" concept="OBS_STATUS"/>
         </ns9:Attributes>
         </ns9:Obs>

         <ns9:Attributes>
         <ns9:Value value="ECB reference exchange rate, Australian dollar/Euro, 2:15 pm (C.E.T.)"
         concept="TITLE_COMPL"/>
         */
        if (elements.length > 0)
            previousName = elements[elements.length - 1];
        currentName = localName;
        elements.push(localName);
        switch (localName) {
            case 'ObsValue':
                obs_value = atts.getValue(atts.getIndex('value'));
                break;
            case 'Obs':
                time_period = '';
                obs_value = '';
                break;
            case 'Value':
                if (!columnsFound) {
                    if ('Attributes' == previousName && elements.indexOf('Group') == elements.length - 3) {
                        if (atts.getValue(atts.getIndex('concept')) == 'TITLE_COMPL') {
                            column_descriptions.push(atts.getValue(atts.getIndex('value')));
                        }
                    }

                    if ('SeriesKey' == previousName && elements.indexOf('Series') == elements.length - 3) {
                        columns.push(atts.getValue(atts.getIndex('concept')));
                    }
                }
                if ('SeriesKey' == previousName && elements.indexOf('Series') == elements.length - 3) {
                    series_vals[atts.getValue(atts.getIndex('concept'))] = atts.getValue(atts.getIndex('value'));
                }
                break;
        }
    };
    contentHandler.endElement = function(namespaceURI, localName, qName) {
        //console.log( "endElement : [" + namespaceURI + "], [" + localName + "], [" + qName + "]" );
        elements.pop();
        switch (localName) {
            case 'SeriesKey':
                columnsFound = true;
                break;
            case 'Series':
                series_vals = {};
                vals = {};
                break;
            case 'Obs':
                // add the time and the observation value
                vals['Value'] = Number(obs_value);
                vals['Time'] = time_period;
                // add the series values to the data array
                for (z in series_vals) {
                    vals[z] = series_vals[z];
                }

                var latestDataFound = false;
                for (z in latestData) {
                    if (latestData[z][breakValue] == vals[breakValue]) {
                        latestDataFound = true;
                        latestData[z] = vals;
                        break;
                    }
                }
                if (!latestDataFound) {
                    latestData.push(vals);
                }
                data.push(vals);
                vals = {};
                break;
        }
    };
    contentHandler.characters = function(ch, start, ch_length) {
        switch (currentName) {
            case 'Time':
                if ('Obs' == previousName)
                    time_period = ch;
                break;
        }
    };
    dojo.byId('content').innerHTML = xmlhttp.responseText;
    try {
        saxParser.setHandler(contentHandler);
        saxParser.parseString(xmlhttp.responseText);
    } catch (e) {
        alert('Error parsing SDMX XML stream: {0}'.format(e.message));
        dojo.style(dojo.byId('content'), "display", "block");
        dojo.byId('content').focus();
        return null;
    }
    sdmxData.data = data;
    sdmxData.latestData = latestData;
    sdmxData.columns = columns;
    sdmxData.column_descriptions = column_descriptions;
    sdmxData.timePeriods = [];
    // add all time periods so we can animate stuff
    for (var v in sdmxData.data) {
        if (sdmxData.timePeriods.indexOf(sdmxData.data[v].Time) == -1) {
            sdmxData.timePeriods.push(sdmxData.data[v].Time);
        }
    }
    return sdmxData;
}

function dataSeemsOk(sdmxData) {
    if (!sdmxData)
        return false;
    if (!sdmxData.data)
        return false;
    if (!sdmxData.latestData)
        return false;
    if (!sdmxData.timePeriods)
        return false;
    return true;
}

function chartResultsBar(idLocation, breakValue, latestData) {
// adds a chart to idLocation using
// breakValue label, to be used when one row of observations per breakValue
// data is an array of SDMX-ML object rows { Time, Value, SDMX_CONCEPTS, .... }
    var chart1 = new dojox.charting.Chart(idLocation);
    var labels = [];
    chart1.setTheme(dojox.charting.themes.Claro);
    chart1.addPlot("default", {type: "Columns", markers: true});
    var xLabelFunc = function(text, value, precision) {
        try {
            var label = labels[value - 1];
            //console.log( label, ':', text, value, precision );
            return label;
        }
        catch (err) {
//console.log( 'xLabelFunc', err.message );
        }
        return null;
    };
    // add values for each column, one per breakValue
    var series = [], firstIndex = '';
    for (z in latestData) {
//console.log( z );
//console.log( latestData[z]);
        firstIndex = z;
        series.push(latestData[z].Value);
        labels.push(latestData[z][breakValue]);
    }

    chart1.addAxis("x",
            {labelFunc: xLabelFunc, majorLabels: true, minorLabels: true, gap: 5,
                title: '{0} - {1}'.format(breakValue, latestData[firstIndex].Time),
                titleOrientation: "away"
            });
    chart1.addAxis("y", {vertical: true, includeZero: true});
    //console.log( 'series', series );
    chart1.addSeries('bar', series);
    // Create the tooltip

    var tip = new dojox.charting.action2d.Tooltip(chart1, "default", {
        text: function(o) {
            return('{0}'.format(o.y));
        }
    });
    chart1.render();
}

function chartResultsLine(idLocation, breakValue, data) {
// adds a chart to idLocation and legend to idLocation+'Legend' using
// breakValue as the value to split the series in data
// data is an array of SDMX-ML object rows { Time, Value, SDMX_CONCEPTS, .... }
    var seriesCount = 0;
    var fillColors = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black'];
    var chart1 = new dojox.charting.Chart(idLocation);
    chart1.setTheme(dojox.charting.themes.Claro);
    chart1.addPlot("default", {type: dojox.charting.plot2d.Lines, markers: true});
    var xLabelFunc = function(text, value, precision) {
        try {
            var label = sdmxDataList[0].timePeriods[Number(text) - 1];
            //console.log( label, ':', text, value, precision );
            return label;
        }
        catch (err) {
//console.log( 'xLabelFunc', err.message );
            return '';
        }
    };
    chart1.addAxis("x", {title: "Time", titleOrientation: "away",
        labelFunc: xLabelFunc,
        majorLabels: true, majorTickStep: 4});
    chart1.addAxis("y", {vertical: true, title: "Value", includeZero: true, majorTickStep: 4});
    // determine the by break series
    var series = [];
    var ref_area = ''; // the break for the series
    for (z in data) {
        var d = data[z][breakValue];
        if (ref_area == '')
            ref_area = d;
        if (ref_area != d) {
            chart1.addSeries(ref_area, series, {stroke: fillColors[seriesCount]});
            seriesCount++;
            if (seriesCount >= fillColors.length)
                seriesCount = 0;
            ref_area = d;
            series = [];
        }

        series.push(data[z].Value);
    }
    chart1.addSeries(ref_area, series, {stroke: fillColors[seriesCount]});
    // Create the tooltip
    new dojox.charting.action2d.Tooltip(chart1, "default", {
        text: function(o) {
            if (o.chart.series.length > 1)
                return ('{0}<br>{1}<br>{2}'.format(o.run.name, o.y, xLabelFunc(o.x)));
            else
                return ('{0}<br>{1}'.format(o.y, xLabelFunc(o.x)));
        }
    });
    // Highlights an area: use the "chart" chart, and "default" plot
    new dojox.charting.action2d.Highlight(chart1, "default");
    chart1.render();
    // http://dojo-toolkit.33424.n3.nabble.com/dojox-charting-wrong-size-when-chart-s-div-is-hidden-td2000025.html
    new dojox.charting.widget.SelectableLegend({chart: chart1, horizontal: true}, idLocation + "Legend");
}

function queryResultsCountDataPoints(breakValue, data) {
// count the data points for the first breakValue series
// to determine what chart to use.
    var dataPoints = 0;
    var ref_area = data[0][breakValue]; // the break for the series

    for (z in data) {
        var d = data[z][breakValue];
        if (ref_area != d) {
            return dataPoints;
        }

        dataPoints++;
    }
    return dataPoints;
}

function addQueryResults(query, queryNumber) {
// if the xmlhttp is a XMLHttpRequest object then parse the result
// otherwise it is probably a stored data object.
// see if a result for this
    var key = JSON.stringify(query);
    var breakField = decodeURIComponent(dojo.byId('breakField').value);
    var recalledData = recallJSON(key);
    if (dataSeemsOk(recalledData))
    {
        console.log('recalled query from local storage');
        sdmxDataList[queryNumber] = recalledData;
    }
    else {
        var soap = build_dataflow_soap(query);
        if (soap) {
            xmlhttp = call_ecb_sdmx_ws_sync(soap, 'GetGenericData');
            sdmxDataList[queryNumber] = parseQueryDataResponse(xmlhttp, breakField);
            storeJSON(key, sdmxDataList[queryNumber]);
        }
    }
}

function tableResults(queryNumber) {
// if the xmlhttp is a XMLHttpRequest object then parse the result
// otherwise it is probably a stored data object.
    var sdmxData = sdmxDataList[queryNumber];
    if (!sdmxData || !sdmxData.data || sdmxData.data.length == 0) {
        alert('No results found');
        return false;
    }
// http://dojo-toolkit.33424.n3.nabble.com/how-to-change-ItemFileWriteStore-data-or-dojox-grid-DataGrid-td2353208.html

    var storeItems = JSON.parse(JSON.stringify(sdmxData.data)); // clone the data as the setStore on the grid changes the original data.
    var store = new dojo.data.ItemFileWriteStore({data: {items: storeItems}});
    var structure = [];
    for (i in sdmxData.columns) {
        structure.push({name: sdmxData.columns[i], field: sdmxData.columns[i], width: '10%'});
    }
    var gridResults = new dojox.grid.DataGrid({structure: structure}, "queryResultsGrid{0}".format(queryNumber));
    gridResults.startup();
    gridResults.setStore(store);
}


function chartResults(queryNumber) {
// chart the given result index
    var sdmxData = sdmxDataList[queryNumber];
    var breakField = decodeURIComponent(dojo.byId('breakField').value);

    if (queryResultsCountDataPoints(breakField, sdmxData.data) == 1 || queryOptions.latestData)
        chartResultsBar("resultsChart{0}".format(queryNumber), breakField, sdmxData.latestData);
    else
        chartResultsLine("resultsChart{0}".format(queryNumber), breakField, sdmxData.data);
    //chartLineGoogle("resultsChart{0}".format(queryNumber), breakField, sdmxData.data, sdmxData.timePeriods);
}

function queryResultsInit() {
//  calls the response functions and web service
    try {
        queryOptions = JSON.parse(decodeURIComponent(dojo.byId('options').value));
    } catch (e) {
    }

    var title = decodeURIComponent(dojo.byId('title').value);
    dojo.byId('h1Title').innerHTML = title;
    dojo.byId('headTitle').innerHTML = title;
    dojo.byId('name').value = title;
    if (dojo.byId('breakField').value == '#breakField#') {
        dojo.byId('breakField').value = 'REF_AREA';
    }
// add all dataflows

    for (var queryNumber = 0; queryNumber < 2; queryNumber++) {
        var queryId = 'query{0}'.format(queryNumber);
        var queryControl = dojo.byId(queryId);
        if (queryControl) {
            var value = queryControl.value;
            if (value[0] != '#') {
                console.log('addding results for {0}'.format(queryId));
                var query = JSON.parse(decodeURIComponent(value));
                // see if a result seems valid for this
                if (query && query.dataSetId) {
                    addQueryResults(query, queryNumber);
                    tableResults(queryNumber);
                } else {
                    console.log('{0} not valid'.format(queryId));
                    break;
                }
            }
        }
    }
    dojo.query(('.hideOnLoad')).removeClass();
    dojo.style(dojo.byId('executing'), 'display', 'none');
    if (sdmxDataList.length > 1) {
        multiAddControls();
        dojo.style(dojo.byId('chart0'), 'display', 'none');
    } else {
        dojo.style(dojo.byId('multiControls'), 'display', 'none');
        chartResults(0);
    }
}

function build_dataflow_soap(query) {
// builds a soap packet from the query
    /*
     query.qAnd = [];
     query.qOr = [];
     query.startTime = '';
     query.endTime = '';
     query.dataSetId = dojo.byId( 'objectid' ).value;
     */
// go through constraints finding all checked and the start and end time.
// first the AND
// then time
// following dataflow id
// and finally all the OR things
    var soap = '<query><quer:And>';
    // Returns query results from the array that match the given query
    var constraintsAdded = 0;
    var i;
    for (i = 0; i < query.qAnd.length; i++) {
        var item = query.qAnd[i];
        soap += '<quer:Dimension id="{0}">{1}</quer:Dimension>'.format(
                item.component,
                item.value);
        constraintsAdded++;
    }

    if (query.startTime.length > 0 && query.endTime.length > 0)
    {
        soap += '<quer:Time>';
        soap += '<quer:StartTime>{0}</quer:StartTime>'.format(query.startTime);
        soap += '<quer:EndTime>{0}</quer:EndTime>'.format(query.endTime);
        soap += '</quer:Time>';
    }
    soap += '<quer:Dataflow>{0}</quer:Dataflow>'.format(query.dataSetId);
    if (query.qOr.length > 0) {
        soap += '<quer:Or>';
        for (i = 0; i < query.qOr.length; i++) {
            var item = query.qOr[i];
            soap += '<quer:Dimension id="{0}">{1}</quer:Dimension>'.format(
                    item.component,
                    item.value);
            constraintsAdded++;
        }
        soap += '</quer:Or>';
    }
    soap += '</quer:And></query>';
    if (constraintsAdded == 0)
    {
        alert('No query constraints found in {0}'.format(JSON.stringify(query)));
        return null;
    }
    return soap;
}

/**
 * Comment
 */
function shorten() {
// unused
    var href = location.href;
    var parts = href.split('?');
    if (parts.length == 2) {
        var uri = encodeURI(parts[0]); // make sure the name is encoded.
        xmlhttp = new XMLHttpRequest();
        var url = '{0}?method=shorten&uri={1}'.format(getQuerypage(), uri);
        //console.log(url);
        xmlhttp.open('GET', url, false);
        xmlhttp.send();
        if (xmlhttp.status == 200) {
            return  xmlhttp.responseText;
        }
        else {
            alert('Error shorten:' + xmlhttp.responseText);
        }
    }
    else {
        alert('Cannot shorten:{0}'.format(href));
    }
    return null;
}

/**
 * Comment
 */
function multiAddControls() {
    /*
     <div id="multiChart" style="height: 80%;"></div>
     <div id="multiChartLegend"></div>

     <div id='multiControls' data-style="display:none">
     <div id='yAxis'>y</div>
     <div id='xAxis'>x</div>
     <div id='bubble'>b</div>
     <input type='button' value='Redraw' onclick='multiRedraw();'/>
     </div>
     */
    chartOptions = queryOptions.chartOptions;
    if (chartOptions) {
        dojo.byId('title0').value = chartOptions.title0;
        dojo.byId('title1').value = chartOptions.title1;
        dojo.byId('title2').value = chartOptions.title2;
    }

    var store = new dojo.store.Memory({
        data: [
            {label: getResultsLabel(0), id: '0'},
            {label: getResultsLabel(1), id: '1'},
            {label: getResultsLabel(2), id: '2'}
        ]
    });
    var select = new dijit.form.Select({
        id: "yAxis",
        label: 'Y Axis',
        value: chartOptions ? chartOptions.xAxis : '0',
        store: new dojo.data.ObjectStore({objectStore: store})}, "yAxis");
    select.startup();
    store.put({label: 'Frequency', id: 'freq'});
    select = new dijit.form.Select({
        id: "xAxis",
        label: 'X Axis',
        value: chartOptions ? chartOptions.yAxis : 'freq',
        store: new dojo.data.ObjectStore({objectStore: store})}, "xAxis");
    select.startup();
    store = new dojo.store.Memory({
        data: [
            {label: '{0} - {1}'.format(getAxisLabel('x'), getAxisLabel('y')), id: 'xMinusy'},
            {label: '{0} - {1}'.format(getAxisLabel('y'), getAxisLabel('x')), id: 'yMinusx'},
            {label: 'Results 3 Value', id: '2'},
            {label: 'none', id: 'none'},
            {label: 'Population', id: 'pop'}// add none value to the bubble
        ]
    });
    select = new dijit.form.Select({
        id: "bubble",
        label: 'Bubble Value',
        value: chartOptions ? chartOptions.bubble : 'none',
        store: new dojo.data.ObjectStore({objectStore: store})}, "bubble");
    select.startup();
    // create options to be saved with stuff.

    if (chartOptions) {
        dijit.byId('bubble').value = chartOptions.bubble;
        multiRedraw();
    }
    dojo.style(dojo.byId('multiButtons'), 'display', 'block');
}

function getResultsLabel(resultsNumber) {
    if (dojo.byId('title{0}'.format(resultsNumber)).value) {
        return dojo.byId('title{0}'.format(resultsNumber)).value;
    }
    else {
        return 'Results Value {0}'.format(resultsNumber + 1);
    }
}

function getAxisLabel(xy) {
    var select = dijit.byId('{0}Axis'.format(xy));
    var v = select.value;
    var label = select.get("displayedValue");
    if (!isNaN(v)) {
        var n = Number(v);
        if (dojo.byId('title{0}'.format(n)).value) {
            label = dojo.byId('title{0}'.format(n)).value;
        }
    }
    return label;
}

/**
 * Comment
 */
var multiChart, multiLegend;
var series = [];
var multiChartOptions, sliderDecrement;
function multiRedraw() {
// adds a chart to idLocation and legend to idLocation+'Legend' using
// breakValue as the value to split the series in data
// data is an array of SDMX-ML object rows { Time, Value, SDMX_CONCEPTS, .... }
    /**
     * return the label of the x or y axis
     */
    var chartOptions = {};
    var idLocation = 'multiChart';
    var breakValue = dojo.byId('breakField').value;
    var labelList = sdmxDataList[0].timePeriods;
    var chartType = 'Default';
    /**
     * Comment
     */
    function getChartOptions() {
        var chartOptions = {};
        // create options to be saved with stuff.

        chartOptions.xAxis = dijit.byId('xAxis').value;
        chartOptions.yAxis = dijit.byId('yAxis').value;
        chartOptions.bubble = dijit.byId('bubble').value;
        chartOptions.title0 = dojo.byId('title0').value;
        chartOptions.title1 = dojo.byId('title1').value;
        chartOptions.title2 = dojo.byId('title2').value;
        return chartOptions;
    }
    chartOptions = getChartOptions();
    var vx = chartOptions.xAxis;
    var vy = chartOptions.yAxis;
    var bubbleChoice = chartOptions.bubble;
    var data_x, data_y;
    if (!isNaN(vx)) {
        chartType = 'Bubble';
        if (Number(vx) > sdmxDataList.length) {
            alert('X axis {0} value not available'.format(vx));
            return;
        }
        data_x = sdmxDataList[Number(vx)].data;
    }
    else if (vx == 'freq') {
        labelList = sdmxDataList[0].timePeriods;
    }
    else {
        alert('choose x axis value');
        return;
    }
    // y axis values

    if (!isNaN(vy)) {
        if (Number(vy) > sdmxDataList.length) {
            alert('Y axis {0} value not available'.format(vy));
            return;
        }
        data_y = sdmxDataList[Number(vy)].data;
    }
    else {
        alert('choose y axis value');
        return;
    }

    queryOptions.chartOptions = chartOptions;
    dojo.byId('options').value = encodeURI(JSON.stringify(queryOptions));
    if (chartType == 'Bubble') {
        //Buggle plot required.
        // freq plot
        // determine the by break series
        // data needs to be [time : {x: value, y: value, label: breakValue}]
        var currentBreak = ''; // the break for the series
        var xlabel = getAxisLabel('x');
        var ylabel = getAxisLabel('y');
        var timePeriods = sdmxDataList[0].timePeriods;
        if (bubbleChoice == 'pop') {
            var countryPopulationList = getPopulation2010();
        }

        // build a x,y data list by time period
        for (var t in  timePeriods) {
            var timePeriod = timePeriods[t];
            for (x in data_x) {
                if (data_x[x].Time == timePeriod) {
                    currentBreak = data_x[x][breakValue];
                    for (y in data_y) {
                        if (data_y[y].Time == timePeriod && currentBreak == data_y[y][breakValue]) {
                            var bubbleValue = 100;
                            switch (bubbleChoice) {
                                case 'xMinusy':
                                    bubbleValue = data_x[x].Value - data_y[y].Value;
                                    break;
                                case 'yMinusx':
                                    bubbleValue = data_y[y].Value - data_x[x].Value;
                                    break;
                                case 'pop':
                                    var area = data_x[x].REF_AREA;
                                    if (countryPopulationList[area]) {
                                        bubbleValue = countryPopulationList[area].population;
                                    }
                                    break;
                            }
                            series.push({Time: timePeriod, x: data_x[x].Value, y: data_y[y].Value, label: currentBreak, bubbleValue: bubbleValue});
                            break;
                        }
                    }
                }
            }
        }
        sliderInitQuery('slider', timePeriods);
        // show the sliders and stuff
        dojo.style(dojo.byId('sliderStuff'), 'display', 'block');
        dojo.style(dojo.byId('sliderPlay'), 'display', 'block');
        chartBubble(idLocation, xlabel, ylabel);
        var tableData = bubblePrepareData(series, xlabel, ylabel, timePeriods[timePeriods.length - 1]);
        multiChart.draw(tableData, multiChartOptions);
    }
    else
    {
        // hide the sliders and stuff
        dojo.style(dojo.byId('sliderStuff'), 'display', 'none');
        // freq plot
        // chartResultsLine(idLocation, breakValue, data_y);
        chartLineGoogle('multiChart', breakValue, sdmxDataList[0].data, sdmxDataList[0].timePeriods);
    }
    dojo.style(dojo.byId('multiInstructions'), 'display', 'none');
}

function chartLineGoogle(idLocation, breakValue, data, timePeriods) {
//    ['x', 'Cats', 'Blanket 1', 'Blanket 2'],
//    ['A',   1,       1,           0.5],
    var breakSeries = [];
    var series = [];
    var ref_area = ''; // the break for the series

    for (z in data) {
        var d = data[z][breakValue];
        if (ref_area == '')
            ref_area = d;
        if (ref_area != d) {
            breakSeries.push({title: ref_area, data: series});
            ref_area = d;
            series = [];
        }

        series.push({Value: data[z].Value, Time: data[z].Time});
    }
    breakSeries.push({title: ref_area, data: series});
    var table = [];
    var line = ['x'];
    for (var b in breakSeries) {
        line.push(breakSeries[b].title);
    }

    table.push(line);
    for (var t in timePeriods) {
        var timePeriod = timePeriods[t];
        line = [timePeriod];
        for (var b in breakSeries) {
            var found = false;

            for (var d in breakSeries[b].data) {
                if (breakSeries[b].data[d].Time == timePeriod) {
                    line.push(breakSeries[b].data[d].Value);
                    found = true;
                    break;
                }
            }
            if (!found) {
                line.push(null); // add missing values
            }
        }

        table.push(line);
    }
    var data = google.visualization.arrayToDataTable(table);
    // Create and draw the visualization.
    new google.visualization.LineChart(document.getElementById(idLocation)).draw(data);
}

function bubblePrepareData(data, xTitle, yTitle, timeSeriesIndex)
{
    var table = [];
    var bubbleOption = dijit.byId('bubble').get('displayedValue');
    var title = '';
    if (bubbleOption != 'none') {
        table.push(['ID', xTitle, yTitle, '', bubbleOption]);
        title = '{0} '.format(bubbleOption);
    } else {
        table.push(['ID', xTitle, yTitle]);
    }
//    var data = google.visualization.arrayToDataTable([
//      ['ID', 'Life Expectancy', 'Fertility Rate', 'Population'],
//      ['CAN',    80.66,              1.67,      33739900],
    for (var z in data) {
        if (data[z].Time == timeSeriesIndex) {
            if (bubbleOption != 'none') {
                var bv = data[z].bubbleValue;
                var sign = bv ? bv < 0 ? -1 : 1 : 0;

                table.push([data[z].label, data[z].x, data[z].y,
                    sign, Math.abs(bv)]);
            } else {
                table.push([data[z].label, data[z].x, data[z].y]);
            }
        }
    }

    multiChartOptions.title = title + timeSeriesIndex;
    var tableData = google.visualization.arrayToDataTable(table);
    return tableData;
}

function chartBubble(idLocation, xTitle, yTitle, timeSeriesIndex) {
    //https://code.google.com/apis/ajax/playground/?type=visualization#bubble_chart
    multiChartOptions = {
        title: timeSeriesIndex,
        hAxis: {title: xTitle},
        vAxis: {title: yTitle},
        bubble: {textStyle: {fontSize: 11}},
        colorAxis: {minValue: -1, maxValue: 1, colors: ['red', 'green'], legend: {position: 'none'}}
    };
    multiChart = new google.visualization.BubbleChart(document.getElementById(idLocation));
}


function sliderInitQuery(controlId, timePeriods) {
    if (dijit.byId('slider')) {
        return; // already created.
    }

    var sliderNode = dojo.byId(controlId);
    // add slider labels
    // http://dojo-toolkit.33424.n3.nabble.com/Programmatic-HorizontalRuleLabels-td964780.html
    var rulesNode = document.createElement('div');
    sliderNode.appendChild(rulesNode);
    var rulesNodeLabels = document.createElement('div');
    sliderNode.appendChild(rulesNodeLabels);
    // use at most 7 time periods.
    var labels = [];
    for (var q = 0; q < timePeriods.length; q += Math.round(timePeriods.length / 7)) {
        if (q < timePeriods.length)
            labels.push(timePeriods[q]);
    }

    new dijit.form.HorizontalRule(
            {count: labels.length, style: "height:1em;font-size:75%;color:gray;"}, rulesNode);
    new dijit.form.HorizontalRuleLabels({
        container: "topDecoration", count: labels.length, labels: labels,
        style: "height:2em;font-size:75%;color:gray;"}, rulesNodeLabels);
    var slider = new dijit.form.HorizontalSlider({
        name: "slider", value: timePeriods.length - 1, minimum: 0,
        maximum: timePeriods.length - 1, intermediateChanges: false,
        discreteValues: timePeriods.length,
        onChange: function(value) {
            var timePeriod;
            try {
                timePeriod = timePeriods[value]; // value is the index;
            } catch (e) {
                return;
            }

            if (!timePeriod) {
                return;
            }

            var tableData = bubblePrepareData(series, multiChartOptions.hAxis.title, multiChartOptions.vAxis.title, timePeriod);
            multiChart.draw(tableData, multiChartOptions);
        }

    }, sliderNode);
    slider.startup();
}

// makes the slider go back and forth
function sliderPlayQuery() {
    // http://stackoverflow.com/questions/9150850/setinterval-dojo-example
    var playTitle = dojo.byId('sliderPlay').value;
    var slider = dijit.byId('slider');
    var intervalTime = 250;
    var minPlayTime = 10000;
    var timePeriods = sdmxDataList[0].timePeriods;
    if (timePeriods.length * intervalTime < minPlayTime)
        intervalTime = Math.round(minPlayTime / timePeriods.length);
    function doIt() {
        if (sliderDecrement)
            slider.decrement(1);
        else
            slider.increment(1);
        if (slider.value >= slider.maximum || slider.value <= slider.minimum)
            stop();
    }

    function stop() {
        clearInterval(sliderPlayInterval); // stop timer
        dojo.byId('sliderPlay').value = 'Play';
    }

    if (playTitle == 'Play') {
        dojo.byId('sliderPlay').value = 'Stop';
        // start timer
        if (slider.value == slider.minimum)
            sliderDecrement = false;
        if (slider.value == slider.maximum)
            sliderDecrement = true;
        sliderPlayInterval = setInterval(doIt, intervalTime);
    } else {
        stop(); // stop timer
    }
}
