<?php

//echo "method=" . $_GET["method"] . '<br>';
//foreach ($_GET as $key => $value) {
//    $querystring = $key . "=" . $value;
//    echo $querystring . '<br>';
//}

if (isset($_GET['method'])) {
	if ($_GET['method'] == 'create' && isset($_GET['name']) && isset($_GET['query0'])) {
		queryCreate();
	} elseif ($_GET['method'] == 'save' && isset($_GET['name']) && isset($_GET['options']) && isset($_GET['filename'])) {
		//querySave($_GET['filename']);
	} elseif ($_GET['method'] == 'list') {
		queryList();
	} elseif ($_GET['method'] == 'shorten' && isset($_GET['uri'])) {
		queryShorten($_GET['uri']);
	} elseif ($_GET['method'] == 'download') {
		queryDownload($_GET['filetype']);
	} elseif ($_GET['method'] == 'get' && isset($_GET['filename'])) {
		queryGet($_GET['filename']);
	} elseif ($_GET['method'] == 'delete' && isset($_GET['filename'])) {
		queryDelete($_GET['filename']);
	} else {
		sendResponse(400, 'method parameters not valid');
	}
} else {
	//echo 'Function not Found';
	sendResponse(400, 'Function not Found');
}

// Helper method to get a string description for an HTTP status code
// From http://www.gen-x-design.com/archives/create-a-rest-api-with-php/
function getStatusCodeMessage($status) {
	// these could be stored in a .ini file and loaded
	// via parse_ini_file()... however, this will suffice
	// for an example
	$codes = Array(
		100 => 'Continue',
		101 => 'Switching Protocols',
		200 => 'OK',
		201 => 'Created',
		202 => 'Accepted',
		203 => 'Non-Authoritative Information',
		204 => 'No Content',
		205 => 'Reset Content',
		206 => 'Partial Content',
		300 => 'Multiple Choices',
		301 => 'Moved Permanently',
		302 => 'Found',
		303 => 'See Other',
		304 => 'Not Modified',
		305 => 'Use Proxy',
		306 => '(Unused)',
		307 => 'Temporary Redirect',
		400 => 'Bad Request',
		401 => 'Unauthorized',
		402 => 'Payment Required',
		403 => 'Forbidden',
		404 => 'Not Found',
		405 => 'Method Not Allowed',
		406 => 'Not Acceptable',
		407 => 'Proxy Authentication Required',
		408 => 'Request Timeout',
		409 => 'Conflict',
		410 => 'Gone',
		411 => 'Length Required',
		412 => 'Precondition Failed',
		413 => 'Request Entity Too Large',
		414 => 'Request-URI Too Long',
		415 => 'Unsupported Media Type',
		416 => 'Requested Range Not Satisfiable',
		417 => 'Expectation Failed',
		500 => 'Internal Server Error',
		501 => 'Not Implemented',
		502 => 'Bad Gateway',
		503 => 'Service Unavailable',
		504 => 'Gateway Timeout',
		505 => 'HTTP Version Not Supported'
	);

	return (isset($codes[$status])) ? $codes[$status] : '';
}

// Helper method to send a HTTP response code/message
function sendResponse($status = 200, $body = '', $content_type = 'text/html') {
	$status_header = 'HTTP/1.1 ' . $status . ' ' . getStatusCodeMessage($status);
	header($status_header);
	header('Content-type: ' . $content_type);
	echo $body;
}

function startsWith($haystack, $needle) {
	//http://stackoverflow.com/questions/834303/php-startswith-and-endswith-functions
	return !strncmp($haystack, $needle, strlen($needle));
}

function queryList() {

// open this directory
	$dirName = "query";

	$myDirectory = opendir($dirName);
	$table = "{ \"queries\": [ ";

// get each entry
	$count = 0;
	while ($entryName = readdir($myDirectory)) {
		if (strlen($entryName) > 3 && is_file("$dirName/$entryName")) {
			$query = file_get_contents("$dirName/$entryName");
			$pairs = strtok($query, "\n");
			$queryName = '';
			$queryTitle = '';
			$queryJSON = array();
			$options = '{}';
			$valuesRead = 0;
			while ($pairs) {

				$values = explode('=', $pairs);
				if ($values[0] == 'name') {
					$queryName = $values[1];
					$valuesRead++;
				}
				if ($values[0] == 'title') {
					$queryTitle = $values[1];
					$valuesRead++;
				}
				if (startsWith($values[0], 'query')) {
					$queryJSON[$values[0]] = $values[1];
					$valuesRead++;
				}
				if ($values[0] == 'options') {
					$options = $values[1];
					$valuesRead++;
				}
				$pairs = strtok("\n");
			}
			//echo "valuesRead == $valuesRead<br/>";
			if ($valuesRead >= 4) {
				if ($count > 0) {
					$table .= ",";
				}
				$table .= "{ \"name\": \"$queryName\", \"filename\": \"$entryName\", \"title\" : \"$queryTitle\",";
				$table .= " \"options\" : $options, ";
				// add all queries
				$q_count = 0;
				foreach ($queryJSON as $q_key => $q_value) {
					if ($q_count > 0) {
						$table .= ',';
					}
					$table .= "\"$q_key\" : $q_value";
					$q_count++;
				}
				$table .= '}';
				$count++;
			} else {
				// invalid query.  remove it
				//unlink("$dirName/$entryName");
			}
		}
	}
	$table .= '] }';
	sendResponse(200, $table);
}

function queryDelete($fileName) {
	$dirName = "query";

	if (file_exists("$dirName/disable-delete.txt")) {
		sendResponse(404, 'file not found');
		return;
	}

	$fileName = basename($fileName);
	$fullName = "$dirName/$fileName";
	if (file_exists($fullName) && strlen($fileName) > 5) {
		unlink($fullName);
		sendResponse(200, 'file deleted');
	} else {
		sendResponse(404, 'file not found');
	}
}

function queryDownload($fileType) {
// saves a file in the download folder to be used to download stuff.
	$dirName = "download";

	if (file_exists("$dirName/disable-create.txt")) {
		sendResponse(403, 'file not found');
		return;
	}

	if (disk_free_space('.') < 1000000000) {
		sendResponse(403, 'Insufficient storage space');
		return;
	}

	$f = fopen('shorten_lock.tmp', 'w');
	if (!$f) {
		sendResponse(403, 'open lock file failed');
		return;
	}
	if (flock($f, LOCK_EX)) {
		$myDirectory = opendir($dirName);

		// remove older files
		while ($entryName = readdir($myDirectory)) {
			$filename = "$dirName/$entryName";
			if (is_file($filename)) {
				if (time() - filemtime($filename) > 2 * 3600) {
					// file older than 2 hours
					unlink($filename);
				}
			}
		}
		$count = 0;
		$finding = true;
		while ($finding) {
			$asc = ord('a');
			while ($asc <= ord('z') && $finding) {
				$chr = chr($asc);
				$filename = "$chr$count.$fileType";
				if (!file_exists("$dirName/$filename"))
					$finding = false;
				$asc++;
			}
			$count++;
		}
		flock($f, LOCK_UN);
		fclose($f);
	}
	else {
		sendResponse(403, 'exclusive lock failed');
		fclose($f);
		return;
	}
	// get the POST data in the request body
	set_time_limit(0);
	$postData = file_get_contents("php://input");
	file_put_contents("$dirName/$filename", $postData);
	sendResponse(200, "$dirName/$filename");
	// then make something to remove it after five minutes
}

function queryShorten($uri) {
	// create a file to hold a short url

	$dirName = "shorten";

	if (file_exists("$dirName/disable-create.txt")) {
		sendResponse(403, 'file not found');
		return;
	}

	if (disk_free_space('.') < 1000000000) {
		sendResponse(403, 'Insufficient storage space');
		return;
	}

	$f = fopen('shorten_lock.tmp', 'w');
	if (!$f) {
		sendResponse(403, 'open lock file failed');
		return;
	}
	if (flock($f, LOCK_EX)) {

		$count = 0;
		$finding = true;
		while ($finding) {
			$asc = ord('a');
			while ($asc <= ord('z') && $finding) {
				$chr = chr($asc);
				$filename = "$chr$count.html";
				if (!file_exists("$dirName/$filename"))
					$finding = false;
				$asc++;
			}
			$count++;
		}
		flock($f, LOCK_UN);
		fclose($f);
	}
	else {
		sendResponse(403, 'exclusive lock failed');
		fclose($f);
	}
	$contents = '<html><head><title>#title#</title><META http-equiv="refresh" content="0;URL=#uri#"></head>
  <body>Redirecting to <a href="#uri#">#title#</a></body></html>';

	$title = 'SDMX Query Created: ' . date("Y-m-d H:i:s");
	//$contents .= 'ip=' . $_SERVER['REMOTE_ADDR'] . "\n";
	//$contents = 'uri=' . $uri . "\n";
	$contents = str_replace('#uri#', $uri, $contents);
	$contents = str_replace('#title#', $title, $contents);
	file_put_contents("$dirName/$filename", $contents);
	sendResponse(200, "$dirName/$filename");
}

function queryCreate() {
	$dirName = "query";

	if (file_exists("$dirName/disable-create.txt")) {
		sendResponse(403, 'file not found');
		return;
	}
	if (disk_free_space('.') < 1000000000) {
		sendResponse(403, 'Insufficient storage space');
		return;
	}

	while (true) {
		$filename = uniqid('query', true) . '.txt';
		if (!file_exists("$dirName/$filename"))
			break;
	}
	$contents = '';
	foreach ($_GET as $key => $value) {
		$contents .= "$key=$value\n";
//echo $key . " = " . $value;;
	}
	file_put_contents("$dirName/$filename", $contents);
	sendResponse(200, 'query created');
}

function querySave($filenameParam) {
// updates the contents of the file
// they should be name=value pairs
	$dirName = "query";

	$basename = basename($filenameParam);
	$filename = "$dirName/$basename";
	if (!file_exists($filename)) {
		sendResponse(404, 'file not found');
		return;
	}
	$contents = file_get_contents($filename);

	$pairs = strtok($contents, "\n");
	$queryName = '';
	$queryTitle = '';
	$queryJSON = '';
	$options = '{}';
	while ($pairs) {

		$values = explode('=', $pairs);
		if ($values[0] == 'name') {
			$queryName = $values[1];
		}
		if ($values[0] == 'title') {
			$queryTitle = $values[1];
		}
		if ($values[0] == 'query') {
			$queryJSON = $values[1];
		}
		if ($values[0] == 'options') {
			$options = $values[1];
		}
		$pairs = strtok("\n");
	}
	foreach ($_GET as $key => $value) {
		if ($key == 'options') {
			$options = $value;
		}
		if (key == 'name') {
			$queryName = $values;
		}
	}
	$n_contents = "name:$queryName\n";
	$n_contents .= "title:$queryTitle\n";
	$n_contents .= "query:$queryJSON\n";
	$n_contents .= "options:$options\n";
	file_put_contents($filename, $n_contents);
	sendResponse(200, 'query saved');
}

function queryGet($filenameParam) {
// returns the contents of the file as JSON
// they should be name=value pairs
	$dirName = "query";

	$basename = basename($filenameParam);
	$filename = "$dirName/$basename";
	if (!file_exists($filename) || strlen($basename) < 5) {
		sendResponse(404, 'file not found');
		return;
	}
	$contents = file_get_contents($filename);
	if (!$contents) {
		sendResponse(404, 'file not found');
		return;
	}

	$pairs = strtok($contents, "\n");
	$queryName = '';
	$queryTitle = '';
	$queryJSON = array();
	$queryBreak = '';
	$options = '{}';
	while ($pairs) {

		$values = explode('=', $pairs);
		if ($values[0] == 'name') {
			$queryName = $values[1];
		}
		if ($values[0] == 'title') {
			$queryTitle = $values[1];
		}
		if (startsWith($values[0], 'query')) {
			$queryJSON[$values[0]] = $values[1];
		}
		if ($values[0] == 'options') {
			$options = $values[1];
		}
		if ($values[0] == 'breakField') {
			$queryBreak = $values[1];
		}
		$pairs = strtok("\n");
	}

	$json = " {
                        \"name\": \"$queryName\", \"filename\": \"$basename\", \"title\" : \"$queryTitle\",\"breakField\" : \"$queryBreak\", ";
	$json .= " \"options\" : $options, ";
	// add all queries
	$q_count = 0;
	foreach ($queryJSON as $q_key => $q_value) {
		if ($q_count > 0) {
			$json .= ',';
		}
		$json .= "\"$q_key\" : $q_value";
		$q_count++;
	}
	$json .= '}';
	sendResponse(200, $json);
}

?>