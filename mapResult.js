// mapResults.js

dojo.require("esri.map");
dojo.require("esri.layers.FeatureLayer");
dojo.require("esri.geometry");
dojo.require("dijit.TooltipDialog");
dojo.require("dijit.form.HorizontalSlider");
dojo.require('dijit.form.HorizontalRule');
dojo.require('dijit.form.HorizontalRuleLabels');

var mapResultsMap, countryCodeList, mapToolTipDialog, mapChart1, heatMapColors;
var currentArea, mapChart1Legend, currentData, highlightSymbol, featureLayer;

function mapChartResultsAddSeries(data, breakValue, seriesKey, seriesName) {
    // determine the by break series
    // breakValue as the value to split the series in data
    // data is an array of SDMX-ML object rows { Time, Value, SDMX_CONCEPTS, .... }
    if (!currentArea)
        return;

    var seriesCount = mapChart1.series.length;

    for (var s in mapChart1.series) {
        if (mapChart1.series[s].name == seriesName) {
            mapChart1.removeSeries(seriesName);
            mapChart1.render();
            sliderRemoveTimeLine();
            mapChart1Legend.refresh();
            sliderUpdateTimeLine(sdmxData.timePeriods, sdmxData.timePeriods[dijit.byId('slider').value]);
            return;
        }
    }

    var fillColors = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black'];
    var series = [];

    for (var z in data) {
        if (data[z][breakValue] == seriesKey) {
            series.push(data[z].Value);
        }
    }
    seriesCount++;
    if (seriesCount >= fillColors.length)
        seriesCount = 0;
    mapChart1.addSeries(seriesName, series, {stroke: fillColors[seriesCount]});
    mapChart1.render();
    sliderRemoveTimeLine();
    mapChart1Legend.refresh();
    sliderUpdateTimeLine(sdmxData.timePeriods, sdmxData.timePeriods[dijit.byId('slider').value]);
}

function mapChartResultsInit(idLocation) {
    // adds a chart to idLocation and legend to idLocation+'Legend' using

    mapChart1 = new dojox.charting.Chart(idLocation);

    mapChart1.setTheme(dojox.charting.themes.Claro);
    mapChart1.addPlot("default", {type: dojox.charting.plot2d.Lines, markers: false});

//http://stackoverflow.com/questions/7450690/add-a-line-not-a-series-to-a-dojo-chart
    mapChart1.addAxis("y2", {
        vertical: true,
        fontColor: "red",
        min: 0,
        max: 1.0,
        minorTicks: false,
        minorLabels: false,
        microTicks: false,
        majorLabels: false,
        leftBottom: false
    });
    mapChart1.addPlot("verticalLine", {type: "Columns", gap: 1, minBarSize: 1, maxBarSize: 1, vAxis: "y2"});

    var xLabelFunc = function(text, value, precision) {
        try {
            var label = sdmxData.timePeriods[Number(text) - 1];
            //console.log( label, ':', text, value, precision );
            return label;
        }
        catch (err) {
            //console.log( 'xLabelFunc', err.message );
            return '';
        }
    };

    mapChart1.addAxis("x", {title: "Time", titleOrientation: "away",
        labelFunc: xLabelFunc,
        majorLabels: true, majorTickStep: 4,
        includeZero: true});
    mapChart1.addAxis("y", {vertical: true, includeZero: true, majorTickStep: 4});

    // Create the tooltip
    new dojox.charting.action2d.Tooltip(mapChart1, "default", {
        text: function(o) {
            var value = Number(o.y).toFixed(2);
            if (o.chart.series.length > 1)
                return ('{0}<br>{1}<br>{2}'.format(o.run.name, value, xLabelFunc(o.x)));
            else
                return ('{0}<br>{1}'.format(value, xLabelFunc(o.x)));

        }
    });
    // Highlights an area: use the "chart" chart, and "default" plot
    new dojox.charting.action2d.Highlight(mapChart1, "default");
    mapChart1Legend = new dojox.charting.widget.SelectableLegend({chart: mapChart1, horizontal: true}, idLocation + "Legend");
    mapChart1.render();
}

// alter the value according to any options
function _performCalculations(data) {
    var perCapita = queryOptions.perCapita;

    for (var z in data) {
        if (perCapita) {
            data[z].Value = data[z].Value / data[z].population;
        }
    }
}

// adds the heat map key table to the map and returns a heat map for the renderer
// performs per captia calculations.

function _addHeatMapKey() {
    var maxValue = -Infinity, minValue = Infinity;
    var data = sdmxData.data;

    for (var z in data) {
        var v = data[z].Value;

        if (v > maxValue)
            maxValue = v;
        if (v < minValue)
            minValue = v;
    }

    var heatmap = new Rainbow();
    heatmap.setSpectrum('yellow', 'red');
    heatmap.setNumberRange(minValue, maxValue);

    // make a key table of the color range

    var table = '<table>';
    for (z = minValue; z < maxValue; z += ((maxValue - minValue) / 5)) {
        var hexColour = '#' + heatmap.colourAt(z);
        table += '<td style="background-color:{0}">{1}</td></tr>'.format(hexColour, z.toFixed(2));
    }
    table += '</table>';
    var keyTable = dojo.byId('keyTable');
    keyTable.innerHTML = table;
    return heatmap;
}

// creates the renderers for the data. returns new renderer
function _renderData(data) {
    currentData = data;
    // merge country code and country name - find range for pretty colors

    for (var z in data) {

        for (c in countryCodeList) {
            if (countryCodeList[c].code == data[z].REF_AREA) {
                data[z].Country = countryCodeList[c].description;
                break;
            }
        }
    }

    // color them shades of yellow to red.
    for (z in data) {
        var v = data[z].Value;
        var hexColour = '#' + heatMapColors.colourAt(v);

        data[z].countryColor = new dojo.Color(hexColour);
        data[z].countryColor.a = 0.5;  // transperancy
    }

    var defaultSymbol = new esri.symbol.SimpleFillSymbol().setStyle(esri.symbol.SimpleFillSymbol.STYLE_NULL);
    defaultSymbol.outline.setStyle(esri.symbol.SimpleLineSymbol.STYLE_NULL);

    //create renderer
    var renderer = new esri.renderer.UniqueValueRenderer(defaultSymbol, "Country");

    //add symbol for each possible value
    for (z in data) {
        var symbol = new esri.symbol.SimpleFillSymbol().setColor(data[z].countryColor);
        //symbol.REF_AREA = data[z].REF_AREA;
        renderer.addValue(data[z].Country, symbol);
        //console.log( data[z].Country, data[z].REF_AREA, data[z].Value );
    }
    return renderer;
}

function _dialogCompareChart(idLocation, currentIndex, data) {
    // adds a chart to the mouse over dialog of the highest and lowest REF_AREA values
    var chart1 = new dojox.charting.Chart(idLocation);
    var labels = [];

    chart1.setTheme(dojox.charting.themes.Claro);
    chart1.addPlot("default", {type: "Columns", markers: false});

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
    var series = [], highest = 0, lowest = 0;
    for (var z in data) {
        if (data[z].Value > data[highest].Value) {
            highest = z;
        }
        if (data[z].Value < data[lowest].Value) {
            lowest = z;
        }
    }

    series.push(data[highest].Value);
    labels.push(data[highest].REF_AREA);
    if (currentIndex != highest && currentIndex != lowest) {
        // don't include current twice
        series.push(data[currentIndex].Value);
        labels.push(data[currentIndex].REF_AREA);
    }
    if (highest != lowest) {
        series.push(data[lowest].Value);
        labels.push(data[lowest].REF_AREA);
    }

    chart1.addAxis("x", {labelFunc: xLabelFunc, majorLabels: true, minorLabels: false, titleOrientation: "away"});
    chart1.addAxis("y", {vertical: true, includeZero: true});
    //console.log( 'series', series );
    chart1.addSeries('bar', series);
    chart1.render();
}

function _onMouseOver(evt) {
    var t = "<strong>${Country}</strong><br/>${DISPLAY_VALUE}<div id='littleChart' style='width:150px;height:100px'></div>";

    // add the measure value to the attributes for the country graphic
//	if( !evt.graphic.attributes.DISPLAY_VALUE ){
    var countryName = evt.graphic.attributes.Country;
    var currentIndex;
    for (z in currentData) {
        if (currentData[z].Country == countryName) {
            var displayValue = Number(currentData[z].Value).toFixed(2);
            evt.graphic.attributes.DISPLAY_VALUE = displayValue;
            evt.graphic.attributes.TIME_PERIOD = currentData[z].Time;
            evt.graphic.attributes.REF_AREA = currentData[z].REF_AREA;
            currentIndex = z;
            break;
        }
    }
//	}

    var content = esri.substitute(evt.graphic.attributes, t);
    var highlightGraphic = new esri.Graphic(evt.graphic.geometry, highlightSymbol);
    mapResultsMap.graphics.add(highlightGraphic);

    mapToolTipDialog.setContent(content);
    currentArea = evt.graphic.attributes.Country;
    dojo.style(mapToolTipDialog.domNode, "opacity", 0.90);
    dijit.popup.open({popup: mapToolTipDialog, x: evt.pageX, y: evt.pageY});
    // display the highest and lowest values of the current time series data.
    _dialogCompareChart('littleChart', currentIndex, currentData);
}

function _onClick(evt) {
    // on click add the current map to the chart
    for (var z in currentData) {
        if (currentData[z].Country == currentArea) {
            var seriesKey = currentData[z].REF_AREA;
//			console.log( seriesKey );
            // add or remove the series for this country
            mapChartResultsAddSeries(sdmxData.data, 'REF_AREA', seriesKey, currentArea);
        }
    }
}

function closeDialog() {
    mapResultsMap.graphics.clear();
    dijit.popup.close(mapToolTipDialog);
    currentArea = null;
}

function initOperationalLayers() {
    var data = sdmxData.latestData;

    heatMapColors = _addHeatMapKey();
    var renderer = _renderData(data);

    dojo.byId('currentTimePeriod').innerHTML = data[0].Time;
    // http://www.abs.gov.au/ausstats/abs@.nsf/Lookup/2901.0Chapter23102011
    // australia
    var featureLayerMap = 'http://services.arcgis.com/NNTV6o6b9N5cVjWM/ArcGIS/rest/services/LGA_2011_AUST_simp/FeatureServer/0';
    // europe
    featureLayerMap = 'https://services.arcgis.com/HuLaMAzbcrbWfOM8/ArcGIS/rest/services/Outline_of_world_countries/FeatureServer/0';
    // country names are their english representation and in the form Capital.
    //"http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Specialty/ESRI_StateCityHighway_USA/MapServer/1"
    featureLayer = new esri.layers.FeatureLayer(
            featureLayerMap,
            {
                mode: esri.layers.FeatureLayer.MODE_ONDEMAND,
                outFields: ["Country"]
            });

    featureLayer.setRenderer(renderer);

    // http://help.arcgis.com/en/webapi/javascript/arcgis/jssamples/#sample/fl_hover
    // sample code start
    mapToolTipDialog = new dijit.TooltipDialog({
        id: "tooltipDialog",
        style: "position: absolute; width: 250px; font: normal normal normal 10pt Helvetica;z-index:100"
    });
    mapToolTipDialog.startup();

    highlightSymbol = new esri.symbol.SimpleFillSymbol(
            esri.symbol.SimpleFillSymbol.STYLE_SOLID,
            new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 0, 0]), 3),
            new dojo.Color([125, 125, 125, 0.35]));

    //close the dialog when the mouse leaves the highlight graphic
    mapResultsMap.graphics.enableMouseEvents();
    dojo.connect(mapResultsMap.graphics, "onMouseOut", closeDialog);

    //listen for when the onMouseOver event fires on the countiesGraphicsLayer
    //when fired, create a new graphic with the geometry from the event.graphic and add it to the maps graphics layer
    dojo.connect(featureLayer, "onMouseOver", function(evt) {
        _onMouseOver(evt);
    });

    dojo.connect(mapResultsMap, "onClick", function(evt) {
        _onClick(evt);
    });
    mapResultsMap.addLayer(featureLayer);
    mapSliderInit('slider');
    mapChartResultsInit('chart');
}

function mapSliderInit(controlId) {
    var sliderNode = dojo.byId(controlId);

    // add slider labels
    // http://dojo-toolkit.33424.n3.nabble.com/Programmatic-HorizontalRuleLabels-td964780.html
    var rulesNode = document.createElement('div');
    sliderNode.appendChild(rulesNode);
    var rulesNodeLabels = document.createElement('div');
    sliderNode.appendChild(rulesNodeLabels);

    // use at most 7 time periods.
    var labels = [];

    for (var q = 0; q < sdmxData.timePeriods.length; q += Math.round(sdmxData.timePeriods.length / 7)) {
        if (q < sdmxData.timePeriods.length)
            labels.push(sdmxData.timePeriods[q]);
    }

    new dijit.form.HorizontalRule(
            {
                count: labels.length,
                style: "height:1em;font-size:75%;color:gray;"
            },
    rulesNode);

    new dijit.form.HorizontalRuleLabels(
            {
                container: "topDecoration",
                count: labels.length,
                labels: labels,
                style: "height:2em;font-size:75%;color:gray;"
            },
    rulesNodeLabels);

    var slider = new dijit.form.HorizontalSlider({
        name: "slider",
        value: sdmxData.timePeriods.length - 1,
        minimum: 0,
        maximum: sdmxData.timePeriods.length - 1,
        intermediateChanges: false,
        discreteValues: sdmxData.timePeriods.length,
        //style: "width:400px;",
        onChange: function(value) {
            // value is the index;
            // so select latestData as thing to map.
            var timePeriod;

            try {
                timePeriod = sdmxData.timePeriods[value];

            } catch (e) {
            }
            ;
            if (!timePeriod) {
                return;
            }

            var data = [];
            for (var z in sdmxData.data) {
                if (sdmxData.data[z].Time == timePeriod) {
                    data.push(sdmxData.data[z]);
                }
            }
            if (data.length) {
                currentData = data;

                closeDialog();
                dojo.byId('currentTimePeriod').innerHTML = timePeriod;
                var renderer = _renderData(currentData);

                var oldRenderer = featureLayer.renderer;
                featureLayer.setRenderer(renderer);
                featureLayer.redraw();
                delete(oldRenderer);
                // put a vertical line on the chart where the time period is.
                sliderUpdateTimeLine(sdmxData.timePeriods, timePeriod);
            }
        }
    }, sliderNode);

    slider.startup();
}

function mapResultResponse(xmlhttp, query) {
    var key = JSON.stringify(query);

    if (xmlhttp.responseText) {
        sdmxData = parseQueryDataResponse(xmlhttp, 'REF_AREA');
        // save the results of query to localStorage
        if (query && dataSeemsOk(sdmxData) && sdmxData.data.length > 0) {
            // only store proper results.

            storeJSON(key, sdmxData);
        }
    }
    else {
        sdmxData = xmlhttp;
    }

    if (!dataSeemsOk(sdmxData)) {
        alert('Data read from sources apears to be invalid.  Please resubmit query.');
        localStorage.removeItem(key);
        return;
    }

    var countryPopulationList = getPopulation2010();

    function _addPopulationToData(countryPopulationList, data) {
        // add population to the country code list.
        for (var d in data) {
            var area = data[d].REF_AREA;
            if (countryPopulationList[area]) {
                data[d].population = countryPopulationList[area].population;
            }
            else {
                console.log('population match not found {0}'.format(area));
                data[d].population = data[d].Value; // TODO: think how to deal with this
            }
            if (data[d].population <= 0) {
                data[d].population = data[d].Value; // prevent divide by stupid errors
            }
        }
    }
    _addPopulationToData(countryPopulationList, sdmxData.data);
    _addPopulationToData(countryPopulationList, sdmxData.latestData);
    _performCalculations(sdmxData.data);
    _performCalculations(sdmxData.latestData);
    // australia
    var extentJSON = {'xmax': -19939668.94658156,
        'xmin': -30349780.70279352,
        'ymax': 314630.66384964343,
        'ymin': -7512521.032550324, "spatialReference": {"wkid": 102100}};
    // EU countries
    extentJSON = {
        xmax: -35726055.524258256,
        xmin: -41596419.29655823,
        ymax: 10220869.529605852,
        ymin: 3372111.795255879,
        spatialReference: {wkid: 102100}};
    var initialExtent = new esri.geometry.Extent(extentJSON);

    mapResultsMap = new esri.Map("map", {
        basemap: "streets",
        //center: [-95.625, 39.243],
        extent: initialExtent,
        zoom: 4,
        slider: false, isPan: false, isScrollWheelZoom: false, isShiftDoubleClickZoom: false
    });

    dojo.style(dojo.byId('executing'), "display", "none");

    dojo.connect(mapResultsMap, "onLoad", initOperationalLayers);
}

function initMapResults() {
    //  calls the response functions and web service
    var query = JSON.parse(decodeURIComponent(dojo.byId('query0').value));
    try {
        queryOptions = JSON.parse(decodeURIComponent(dojo.byId('options').value));
        queryOptions.map = true;
        dojo.byId('options').value = encodeURI(JSON.stringify(queryOptions));
    } catch (e) {
        console.log('no options');
        queryOptions = {};
    }
    ;
    var title = decodeURIComponent(dojo.byId('title').value);

    dojo.byId('h1Title').innerHTML = '{0} {1}'.format(title, queryOptions.perCapita ? 'per Capita' : '');
    dojo.byId('headTitle').innerHTML = title;
    dojo.byId('name').value = title;

    countryCodeList = getCodelist('CL_AREA_EE');
    var k = JSON.stringify(query), z;

    z = recallJSON(k);

    if (z)
    {
        console.log('reading query from local storage');
        sdmxData = z;
        mapResultResponse(sdmxData, query);
    }
    else {
        var soap = build_dataflow_soap(query);
        if (soap)
            call_ecb_sdmx_ws(soap, 'GetGenericData', null, mapResultResponse, query);
    }
    windowDimensions('windowDimensions');
}

var sliderPlayInterval, sliderDecrement = true;

// makes the slider go back and forth
function sliderPlay() {
    // http://stackoverflow.com/questions/9150850/setinterval-dojo-example
    var playTitle = dojo.byId('sliderPlay').value;
    var slider = dijit.byId('slider');
    var intervalTime = 250;
    var minPlayTime = 10000;

    if (sdmxData.timePeriods.length * intervalTime < minPlayTime)
        intervalTime = Math.round(minPlayTime / sdmxData.timePeriods.length);

    function doIt() {
        if (sliderDecrement)
            slider.decrement(1);
        else
            slider.increment(1);
        if (slider.value >= slider.maximum || slider.value <= slider.minimum)
            stop();
    }

    function stop() {
        // stop timer
        clearInterval(sliderPlayInterval);
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
        // stop timer
        stop();
    }
}

function sliderRemoveTimeLine() {
    var seriesName = 'verticalLine';

    for (var s in mapChart1.series) {
        if (mapChart1.series[s].name == seriesName) {
            mapChart1.removeSeries(seriesName);
        }
    }
}

// add a vertical line to the chart where the current time period is located.
function sliderUpdateTimeLine(data, timePeriod) {
    // data is an array of timePeriods

    var seriesName = 'verticalLine';

    for (var s in mapChart1.series) {
        if (mapChart1.series[s].name == seriesName) {
            mapChart1.removeSeries(seriesName);
        }
    }
    if (mapChart1.series.length == 0) {
        return;
    }

    var verticalLineData = [], linePos = 0;

    for (var v in data) {
        if (data[v] == timePeriod) {
            linePos = v;
            verticalLineData.push(1);
        } else {
            verticalLineData.push(0);
        }
    }
    if (linePos > 0 && linePos < data.length - 1) {
        // only draw when line not at the end
        mapChart1.addSeries(seriesName, verticalLineData, {plot: "verticalLine"});
        //Bring it to the front and render:

        mapChart1.movePlotToFront("verticalLine");
    }
    mapChart1.render();
}
