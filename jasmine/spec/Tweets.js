describe("Tweets", function () {
	var feed,
		sinceId = 1,
		oneTweet = {
			"created_at": "Fri Jun 26 16:01:03 +0000 2015",
			"username": "salesforce",
			"name": "Salesforce",
			"content": "Some content",
			"retweets": 0,
			"id": 1
		};
		feedResponseValid = {
			status: 200,
			contentType: 'application/json',
			responseText: JSON.stringify([oneTweet])
		},
		feedResponseNewData = {
			status: 200,
			contentType: 'application/json',
			responseText: ''
		},
		feedResponseBig = {
			status: 200,
			contentType: 'application/json',
			responseText: ''
		},
		feedResponseFail = {
			status: 500,
			contentType: 'application/json',
			responseText: '{"error_code":500,"error_message":"Error"}'
		},
		feedResponseInvalid = {
			status: 500,
			contentType: 'application/json',
			responseText: 'nothing'
		};

	var newTweet = _.clone(oneTweet);
	newTweet.id = sinceId + 1;
	feedResponseNewData.responseText = JSON.stringify(newTweet);
	var payLoad = [], tmp;
	for (var i=2; i<7; i++) {
		tmp = _.clone(oneTweet);
		tmp.id = sinceId + i;
		payLoad.push(tmp);
	}
	feedResponseBig.responseText = JSON.stringify(payLoad);

	beforeEach(function () {
		jasmine.Ajax.install();
		feed = new Tweets([], {limit: 5});
	});
	afterEach(function () {
		jasmine.Ajax.uninstall();
		feed = undefined;
	});

	describe("Feed", function () {
		it("getting a fresh feed", function () {
			var syncListen = jasmine.createSpy('syncListen'),
				failListen = jasmine.createSpy('failListen');
			feed.on('sync', syncListen);
			feed.on('error', failListen);
			feed.refresh();
			var request = jasmine.Ajax.requests.mostRecent();
			expect(request.url).toBe('/api.php');
			request.respondWith(feedResponseValid);
			expect(syncListen).toHaveBeenCalled();
			expect(failListen).not.toHaveBeenCalled();
			expect(feed.length).toEqual(1);
			expect(feed.models[0]).toEqual(jasmine.any(Tweet));
		});

		it("fails to get feed", function () {
			var syncListen = jasmine.createSpy('syncListen'),
				failListen = jasmine.createSpy('failListen');
			feed.on('sync', syncListen);
			feed.on('error', failListen);
			feed.refresh();
			var request = jasmine.Ajax.requests.mostRecent();
			expect(request.url).toBe('/api.php');
			request.respondWith(feedResponseFail);
			expect(syncListen).not.toHaveBeenCalled();
			expect(failListen).toHaveBeenCalled();
			expect(feed.length).toEqual(0);
		});

		it("refreshes", function () {
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseValid);
			feed.refresh();
			expect(jasmine.Ajax.requests.mostRecent().url).toBe('/api.php?since=' + sinceId);
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseNewData);
			expect(feed.length).toEqual(2);
		});

		it("truncates at limit", function () {
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseBig);
			expect(feed.length).toEqual(feed.limit);
		});

		it("pushes out old items", function () {
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseValid);
			var model = feed.models[0];
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseBig);
			expect(feed.models).not.toEqual(jasmine.arrayContaining([model]));
		});
	});

	describe("Feed view", function () {
		var feedView;

		beforeEach(function () {
			feedView = new FeedView({collection:feed});
		});
		afterEach(function () {
			feedView = undefined;
		});

		it("shows loading", function () {
			spyOn(feedView, 'startLoading').and.callThrough();
			spyOn(feedView, 'stopLoading').and.callThrough();
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseValid);
			expect(feedView.startLoading).toHaveBeenCalled();
			expect(feedView.stopLoading).toHaveBeenCalled();
			expect(feedView.loading).toEqual(jasmine.any(FeedLoadingView));
		});

		it("creates sub-views", function () {
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseValid);
			expect(feedView.subviews[feed.models[0].cid]).toEqual(jasmine.any(TweetView));
		});
	
		it("creates new subviews", function () {
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseValid);
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseNewData);
			for (var i=0; i< feed.length; i++) {
				expect(feedView.subviews[feed.models[i].cid]).toEqual(jasmine.any(TweetView));
			}
		});

		it("renders on load", function () {
			spyOn(feedView, 'render').and.callThrough();
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseValid);
			expect(feedView.render).toHaveBeenCalled();
			expect(feedView.$el.html()).not.toEqual('');
		});

		it("clears view on reset", function () {
			spyOn(feedView, 'render').and.callThrough();
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseValid);
			feed.reset();
			expect(feedView.render).toHaveBeenCalled();
			expect(feedView.$el.html()).toEqual('');
		});

		it("deletes old sub-views on reset", function () {
			spyOn(feedView, 'render').and.callThrough();
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseValid);
			var cid = feed.models[0].cid;
			feed.reset();
			expect(feedView.subviews[cid]).toBeUndefined();
			expect(feedView.render).toHaveBeenCalled();
		});

		it("deletes old sub-views on remove", function () {
			spyOn(feedView, 'render').and.callThrough();
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseValid);
			var cid = feed.models[0].cid;
			feed.remove(feed.models[0]);
			expect(feedView.subviews[cid]).toBeUndefined();
			expect(feedView.render).toHaveBeenCalled();
		});

		it("deletes old sub-views on new data", function () {
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseValid);
			var cid = feed.models[0].cid;
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseBig);
			expect(feedView.subviews[cid]).toBeUndefined();
		});

		it("displays errors", function () {
			spyOn(feedView, 'displayError');
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseFail);
			expect(feedView.displayError).toHaveBeenCalled();
			var call = feedView.displayError.calls.mostRecent();
			expect(call.args[0]).toBeDefined();
			expect(call.args[0].message).toEqual("Error");
			expect(call.args[0].code).toEqual(500);
		});

		it("display default errors", function () {
			spyOn(feedView, 'displayError');
			feed.refresh();
			jasmine.Ajax.requests.mostRecent().respondWith(feedResponseInvalid);
			expect(feedView.displayError).toHaveBeenCalled();
			var call = feedView.displayError.calls.mostRecent();
			expect(call.args[0]).toBeDefined();
			expect(call.args[0].code).toEqual(-1);
		});

		describe("Filter view", function () {
			var filterView;
			beforeEach(function () {
				filterView = new FeedFilterView({feed:feedView});
				feed.refresh();
				jasmine.Ajax.requests.mostRecent().respondWith(feedResponseValid);
			});
			afterEach(function () {
				fiterView = undefined;
			});

			it("renders on input", function () {
				spyOn(filterView, 'render');
				filterView.$el
					.val('does_not_exist')
					.trigger('keyup');
				expect(filterView.render).toHaveBeenCalled();
			});
			it('filters out non matching input', function () {
				var view = feedView.subviews[feed.models[0].cid];
				spyOn(view, 'deactivate');
				filterView.$el
					.val('does_not_exist')
					.trigger('keyup');
				expect(view.deactivate).toHaveBeenCalled();
			});
			it('filters in matching input', function () {
				var view = feedView.subviews[feed.models[0].cid];
				spyOn(view, 'activate');
				filterView.$el
					.val('content')
					.trigger('keyup');
				expect(view.activate).toHaveBeenCalled();
			});
			it('refreshes filter on new data', function () {
				spyOn(filterView, 'render');
				expect(filterView.render).not.toHaveBeenCalled();
				feed.refresh();
				jasmine.Ajax.requests.mostRecent().respondWith(feedResponseBig);
				expect(filterView.render).toHaveBeenCalled();
			});
		});
	});
});

describe("Error View", function () {
	var error;

	beforeEach(function () {
		jasmine.clock().install();
		error = new ErrorView({message: "error", code: 1, timeout: 1000});
		jQuery.fx.off = true;
	});
	afterEach(function () {
		error = undefined;
		jasmine.clock().uninstall();
	});

	it("renders", function () {
		expect(error.$el.html()).not.toEqual('');
	});

	it("auto dismisses", function () {
		spyOn(error, 'dismiss');
		jasmine.clock().tick(500);
		expect(error.dismiss).not.toHaveBeenCalled();
		jasmine.clock().tick(501);
		expect(error.dismiss).toHaveBeenCalled();
	});
});