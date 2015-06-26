var Tweet = Backbone.Model.extend({});

var Tweets = Backbone.Collection.extend({
	model: Tweet,
	url: '/api.php',
	comparator: function (item) { return -item.get('id'); },
	limit: null,
	initialize: function (models, options) {
		options = options||{};
		this.limit = options.limit||10;
	},
	refresh: function (whenDone) {
		var params = {};
		if (this.length > 0) params.since = this.first().id;
		this.fetch({
			update: true,
			remove: false,
			data: params,
			success: function (collection) {
				collection.set(collection.first(collection.limit));
				if (typeof whenDone === 'function') whenDone();
			},
			error: function () {
				if (typeof whenDone === 'function') whenDone();
			}
		});
	}
});

var FeedView = Backbone.View.extend({
	tagName: 'ul',
	className: 'feed',
	initialize: function () {
		this.listenTo(this.collection, 'request', function () {
			this.startLoading();
		});
		this.listenTo(this.collection, 'error', function (collection, xhr) {
			var message;
			if (xhr.responseJSON && xhr.responseJSON.error_code) {
				message = {message: xhr.responseJSON.error_message, code: xhr.responseJSON.error_code};
			} else {
				message = {message: 'Unknown error occurred.', code: -1};
			}
			this.displayError(message);
			this.stopLoading();
		});
		this.listenTo(this.collection, 'remove', function (model) {
			if (this.subviews[model.cid] !== undefined)
				delete this.subviews[model.cid];
		});
		this.listenTo(this.collection, 'sync', function () {
			this.render();
			this.stopLoading();
		});
		this.listenTo(this.collection, 'reset', function () {
			for (var id in this.subviews) {
				delete this.subviews[id];
			}
			this.render();
		});
		this.subviews = {};
		this.render();
	},
	startLoading: function () {
		if (!this.loading) {
			this.loading = new FeedLoadingView();
			this.$el.parent().prepend(this.loading.el);
		}
		this.loading.show();
	},
	stopLoading: function () {
		if (!this.loading) return;
		this.loading.hide();
	},
	displayError: function (message) {
		var err = new ErrorView(message);
		this.$el.prepend(err.el);
	},
	render: function () {
		this.$el.empty();
		var view;
		for (var i=0; i<this.collection.length; i++) {
			if (this.subviews[this.collection.models[i].cid] !== undefined) {
				view = this.subviews[this.collection.models[i].cid];
			} else {
				view = new TweetView({model: this.collection.models[i]});
				this.subviews[this.collection.models[i].cid] = view;
			}
			this.$el.append(view.el);
		}
		return this;
	}
});

var TweetView = Backbone.View.extend({
	tagName: 'li',
	className: 'tweet',
	template: _.template(
		'<header>' +
			'<% if (typeof picture !== \'undefined\') { %><img src="<%= picture %>" width="48" height="48" alt="<%- name %>" /><% } %>' +
			'<a href="https://twitter.com/<%- username %>" class="user"><%- name %><span class="handle">@<%- username %></span></a>' +
			'<div class="info">' +
				'Retweets: <%- typeof retweets === \'undefined\' ? 0 : (retweets||0) %>' +
			'</div>' +
		'</header>' +
		'<content><%- content %></content>' +
		'<% if (typeof created_at !== \'undefined\') { var d = new Date(created_at), m = d.getMinutes(), h = d.getHours(); %>' +
			'<aside><%= ' +
				'(d.getMonth()+1) + \'/\' + d.getDay() + \'/\' + d.getFullYear() + \' \' +' +
				'(h > 12 ? h-12 : h) + \':\' + (m < 10 ? \'0\'+m : m) + \' \' + (h<12 ? \'am\' : \'pm\')' +
			'%></aside>' +
		'<% } %>'
	),
	initialize: function () {
		this.render();
	},
	render: function () {
		this.$el.html(this.template(this.model.attributes));
		return this;
	},
	activate: function () {
		this.$el.removeClass('inactive');
	},
	deactivate: function () {
		this.$el.addClass('inactive');
	}
});

var FeedLoadingView = Backbone.View.extend({
	tagName: 'li',
	className: 'loading',
	template: '<span class="loading-anim"></span> Loading...',
	initialize: function () {
		this.render();
	},
	render: function () {
		this.$el.html(this.template);
	},
	show: function () {
		this.$el.css({visibility:'visible'});
	},
	hide: function () {
		this.$el.css({visibility:'hidden'});
	}
});
var ErrorView = Backbone.View.extend({
	tagName: 'li',
	className: 'error',
	template: _.template('<%-message%>'),
	initialize: function (init) {
		this.error = init;
		this.render();
	},
	render: function () {
		this.$el
			.html(this.template(this.error))
			.slideDown(300);
		setTimeout((function () { this.dismiss(); }).bind(this), this.error.timeout||10000);
	},
	dismiss: function () {
		this.$el
			.slideUp(300)
			.queue(function(next) { this.remove(); next(); });
	}
});

var FeedFilterView = Backbone.View.extend({
	tagName: 'input',
	className: 'search',
	events: {
		'keyup': 'filterConnectedView'
	},
	initialize: function (init) {
		this.feed = init.feed;
		this.listenTo(this.feed.collection, 'update', function () {
			this.render();
		});
		this.$el.attr('placeholder', 'Search...');
	},
	render: function () {
		var val = this.$el.val(),
			view,
			m = new RegExp(val.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), 'i');
		for (var id in this.feed.subviews) {
			view = this.feed.subviews[id];
			if (view.model && (val === '' || m.test(view.model.attributes.content))) {
				view.activate();
			} else view.deactivate();
		}
	},
	filterConnectedView: function (event) {
		if (event.keyCode == 27)
			this.$el.val('');
		if (!this.feed) return;
		this.render();
	}
});
