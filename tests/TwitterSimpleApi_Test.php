<?php
$base = dirname(__FILE__);
require_once $base.'/../api_classes.php';
require_once $base.'/../config.php';

class TwitterSimpleApiTest extends PHPUnit_Framework_TestCase {
	protected static $api = null;

	public static function setUpBeforeClass() {
		self::$api = new TwitterSimpleApi;
	}

	public static function tearDownAfterClass() {
		self::$api = null;
	}

	public function testInit() {
		$this->assertInstanceOf('TwitterSimpleApi', self::$api, 'Api not initalized?');
		$this->assertFalse(self::$api->isAuthenticated(), 'Api is automatically authenticated?');
	}

	/**
	 * @expectedException Exception
	 * @expectedExceptionCode 403
	 * @depends testInit
	 */
	public function testAuthFail() {
		self::$api->auth('','');
	}

	/**
	 * @depends testAuthFail
	 */
	public function testNotAuthAfterFail() {
		$this->assertFalse(self::$api->isAuthenticated(), 'The api show as authenticated after fail');
		$res = self::$api->getTimeline(TWITTER_ACCOUNT, 10);
		$this->assertTrue($res->isError(), 'Api does not return fail, even though not authenticated');
		$this->assertTrue($res->getErrorMessage() !== '', 'No message shown for error?');
		$this->assertNotEmpty($res->response, 'Response is empty, probably a connection error.');
	}

	/**
	 * @depends testAuthFail
	 */
	public function testAuthSuccess() {
		self::$api->auth(TWITTER_API_KEY, TWITTER_API_SECRET);
		$this->assertTrue(self::$api->isAuthenticated(), 'Authentication invalid?');
	}

	/**
	 * @depends testAuthSuccess
	 */
	public function testFetchLimit() { // Assuming the test accoung will always have more than 3 tweets
		// Make sure we fetch 3 tweets
		$res = self::$api->getTimeline(TWITTER_ACCOUNT, 3);
		$this->assertFalse($res->isError(), 'Results not fetched');
		$this->assertEquals('', $res->getErrorMessage());
		$this->assertEquals(-1, $res->getErrorCode());
		$this->assertNotEmpty($res->response, 'Empty response?');
		$this->assertEquals(3, count($res->response), 'The result count must be 3');

		// Make sure max_id (last tweet) with limit 1 gets the last tweet
		$check = self::$api->getTimeline(TWITTER_ACCOUNT, 1, null, $res->response[2]['id_str']);
		$this->assertFalse($check->isError(), 'Results not fetched');
		$this->assertNotEmpty($check->response, 'Empty response?');
		$this->assertEquals(1, count($check->response), 'The result count must be 1');
		$this->assertEquals($res->response[2]['id_str'], $check->response[0]['id_str'], 'Max id response is not the last id?');

		// Make sure max_id (middle tweet) and since (last tweet) with limit 1 get the middle tweet
		$check = self::$api->getTimeline(TWITTER_ACCOUNT, 1, $res->response[2]['id_str'], $res->response[1]['id_str']);
		$this->assertFalse($check->isError(), 'Results not fetched');
		$this->assertNotEmpty($check->response, 'Empty response?');
		$this->assertEquals(1, count($check->response), 'The result count must be 1');
		$this->assertEquals($res->response[1]['id_str'], $check->response[0]['id_str'], 'Since id response is not the last id?');

		// Make sure that since (last tweet) with limit 1 gets the first tweet
		$check = self::$api->getTimeline(TWITTER_ACCOUNT, 1, $res->response[2]['id_str']);
		$this->assertFalse($check->isError(), 'Results not fetched');
		$this->assertNotEmpty($check->response, 'Empty response?');
		$this->assertEquals(1, count($check->response), 'The result count must be 1');
		$this->assertEquals($res->response[0]['id_str'], $check->response[0]['id_str'], 'Since id response is not the last id?');
	}

	/**
	 * @depends testAuthSuccess
	 */
	public function testWrongAccount() {
		$res = self::$api->getTimeline('____no___such___user___');
		$this->assertTrue($res->isError());
		$this->assertEquals(404, $res->getErrorCode());
		$this->assertEquals('Sorry, that page does not exist. (34).', $res->getErrorMessage());
	}
}
