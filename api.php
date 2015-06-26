<?php
if (version_compare('5.5.0', phpversion()) > 0 or !extension_loaded('curl')) {
	header((isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0').' 500 Internal Server Error');
	echo json_encode(array(
		'error_code' => 0,
		'error_message' => 'The server is not running the correct version or PHP (5.5 and up) or the cURL extension is not loaded'
	));
	exit();
}
require_once 'config.php';
require_once 'api_classes.php';

header('Content-Type: application/json');
try {
	$api = new TwitterSimpleApi();
	$api->auth(TWITTER_API_KEY, TWITTER_API_SECRET);
	$res = $api->getTimeline(
		TWITTER_ACCOUNT,
		10,
		(isset($_GET['since']) and is_numeric($_GET['since'])) ? $_GET['since'] : null,
		(isset($_GET['max']) and is_numeric($_GET['max'])) ? $_GET['max'] : null
	);
	if ($res->isError()) throw new Exception($res->getErrorMessage(), $res->getErrorCode());
	echo json_encode(array_map(function ($tweet) {
		return array(
			'created_at' => $tweet['created_at'],
			'username' => $tweet['user']['screen_name'],
			'name' => $tweet['user']['name'],
			'picture' => $tweet['user']['profile_image_url_https'],
			'content' => $tweet['text'],
			'retweets' => $tweet['retweet_count'],
			'id' => $tweet['id_str'] // In case the id is too big for the machine
		);
	}, $res->response)); // reduce returned payload
} catch (Exception $e) {
	header((isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0').' 500 Internal Server Error');
	echo json_encode(array(
		'error_code' => $e->getCode(),
		'error_message' => $e->getMessage()
	));
}
