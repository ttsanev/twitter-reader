<?php
$base = dirname(__FILE__);
require_once $base.'/../api_classes.php';
require_once $base.'/../config.php';

class TwitterSimpleApi_Response_Test extends PHPUnit_Framework_TestCase {

	public function testEmpty() {
		$r = new TwitterSimpleApi_Response(null, null);
		$this->assertTrue($r->isError());
		$this->assertEquals('Unknown Error (500)', $r->getErrorMessage());
		$this->assertEquals(500, $r->getErrorCode());
		$this->assertEmpty($r->response);
		$this->assertTrue(is_array($r->response), 'The response of an empty result should always be array');
	}

	public function testErrorEmptyResponse() {
		$r = new TwitterSimpleApi_Response(array('HTTP/1.1 403 Forbidden'), null);
		$this->assertTrue($r->isError());
		$this->assertEquals('Forbidden (403)', $r->getErrorMessage());
		$this->assertEquals(403, $r->getErrorCode());
		$this->assertEmpty($r->response);
		$this->assertTrue(is_array($r->response), 'The response of an empty result should always be array');
	}

	public function testErrorWithMessage() {
		$r = new TwitterSimpleApi_Response(array('HTTP/1.1 403 Forbidden'), '{"errors":"message"}');
		$this->assertTrue($r->isError());
		$this->assertEquals('message', $r->getErrorMessage());
		$this->assertEquals(403, $r->getErrorCode());
		$this->assertNotEmpty($r->response);
		$this->assertArrayHasKey('errors', $r->response);
	}

	public function testSuccessEmptyResponse() {
		$r = new TwitterSimpleApi_Response(array('HTTP/1.1 200 OK'), '');
		$this->assertFalse($r->isError());
		$this->assertEquals('', $r->getErrorMessage());
		$this->assertEquals(-1, $r->getErrorCode());
		$this->assertEmpty($r->response);
		$this->assertTrue(is_array($r->response), 'The response of an empty result should always be array');
	}

	public function testSuccessWithResponse() {
		$r = new TwitterSimpleApi_Response(array('HTTP/1.1 200 OK'), '{"is":"ok"}');
		$this->assertFalse($r->isError());
		$this->assertEquals('', $r->getErrorMessage());
		$this->assertEquals(-1, $r->getErrorCode());
		$this->assertNotEmpty($r->response);
		$this->assertTrue(is_array($r->response), 'The response should be array');
		$this->assertArrayHasKey('is', $r->response);
	}

	public function testSuccessWithInvalidRespons() {
		$r = new TwitterSimpleApi_Response(array('HTTP/1.1 200 OK'), '{"is:"ok"}');
		$this->assertTrue($r->isError());
		$this->assertEquals('OK + Syntax error (500)', $r->getErrorMessage());
		$this->assertEquals(500, $r->getErrorCode());
		$this->assertEmpty($r->response);
		$this->assertTrue(is_array($r->response), 'The response should be array');
	}

	public function testContinue() {
		$r = new TwitterSimpleApi_Response(array('HTTP/1.1 100 Continue', 'HTTP/1.1 200 OK'), null);
		$this->assertFalse($r->isError());
		$this->assertEquals(-1, $r->getErrorCode());
		$r = new TwitterSimpleApi_Response(array('HTTP/1.1 100 Continue', 'HTTP/1.1 404 Not Found'), null);
		$this->assertTrue($r->isError());
		$this->assertEquals(404, $r->getErrorCode());
	}
}
