<?php
class TwitterSimpleApi {
	const API_URL = 'https://api.twitter.com';
	protected $_token = null;

	public function auth($key, $secret) {
		$token = base64_encode($key.':'.$secret);
		$result = $this->_makeRequest(
			'POST',
			'/oauth2/token',
			array('grant_type' => 'client_credentials'),
			array('Authorization: Basic '.$token)
		);
		if ($result->isError()) throw new Exception($result->getErrorMessage(), $result->getErrorCode());
		if (!$result->response['access_token']) throw new UnexpectedValueException('Auth result received, but token is missing');
		$this->_token = $result->response['access_token'];
		return $this;
	}

	public function isAuthenticated() {
		return $this->_token !== null;
	}

	protected function _makeRequest($method = 'GET', $url, array $params = null, array $headers = null) {
		if ($headers === null) $headers = array();
		$full_url = self::API_URL.$url;
		$ch = curl_init();
		curl_setopt_array($ch, array(
			CURLOPT_USERAGENT => 'twitterSimpleApi/0.1',
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_TIMEOUT => 5,
			CURLOPT_FAILONERROR => false
		));
		switch ($method) {
			case 'GET':
			case 'get':
				curl_setopt($ch, CURLOPT_HTTPGET, 1);
				if (!empty($params))
					$full_url .= (strpos($full_url, '?') !== false ? '&' : '?').http_build_query($params);
				break;
			case 'POST':
			case 'post':
				curl_setopt($ch, CURLOPT_POST, 1);
				curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
				break;
			default:
				throw new InvalidArgumentException('Method '.$method.' not implemented');
		}
		if (!empty($headers)) curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
		$response_headers = array();
		curl_setopt($ch, CURLOPT_HEADERFUNCTION, function ($ch, $header) use (&$response_headers) {
			$response_headers[] = $header;
			return strlen($header);
		});
		curl_setopt($ch, CURLOPT_URL, $full_url);
		$response = curl_exec($ch);
		if ($response === false) return new TwitterSimpleApi_Response($response_headers, array('errors'=>curl_error($ch)));
		curl_close($ch);
		return new TwitterSimpleApi_Response($response_headers, $response);
	}

	public function getTimeline($user, $count = null, $since_id = null, $max_id = null) {
		$params = array('screen_name' => $user);
		if ($since_id) $params['since_id'] = $since_id;
		if ($max_id) $params['max_id'] = $max_id;
		if ($count > 0) $params['count'] = $count;
		return $this->_makeRequest(
			'GET',
			'/1.1/statuses/user_timeline.json',
			$params,
			array('Authorization: Bearer '.$this->_token)
		);
	}
}

class TwitterSimpleApi_Response {
	protected $_response_code = 500;
	protected $_response_string = 'Unknown Error';
	public $response = array();

	public function __construct($meta, $response) {
		if (is_array($meta)) foreach ($meta as $header) {
			if (preg_match("'^HTTP/([0-9.]+) ([0-9]+) (.+)$'i", $header, $match) and $match[2] != 100) {
				// Search for another status is HTTP/x.x 100 Continue
				$this->_response_code = (int)$match[2];
				$this->_response_string = $match[3];
				break;
			}
		}
		if ($response) {
			$response = json_decode($response, true);
			if ($response === null and json_last_error() !== JSON_ERROR_NONE) {
				$this->_response_code = 500;
				$this->_response_string .= ' + '.json_last_error_msg();
			} else {
				$this->response = $response;
			}
		}
	}

	public function isError() {
		return $this->_response_code !== 200;
	}

	public function getErrorMessage() {
		if ($this->_response_code === 200) return '';
		if (is_array($this->response) and isset($this->response['errors'])) {
			if (is_array($this->response['errors'])) {
				return implode(' ', array_map(
						function ($a) { return $a['message'].' ('.$a['code'].').'; },
						$this->response['errors']
					));
			} else return $this->response['errors'];
		} else return $this->_response_string.' ('.$this->_response_code.')';
	}

	public function getErrorCode() {
		return $this->_response_code !== 200 ? $this->_response_code : -1;
	}

	public function getStatus() {
		return $this->_reponse_string;
	}
}
