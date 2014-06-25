'use strict';

var app = angular.module('natmusSamlingerApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngProgress',
  'infinite-scroll'
]);

app.controller('searchController', function($scope, Search, ngProgress) {
    $scope.ngProgress = ngProgress;
    $scope.search = new Search(ngProgress);
});

app.factory('Search', function($location, $http) {
    var Search = function(ngProgress) {
        this.results = [];
        this.offset = 0;
        this.updated = false;
        this.ngProgress = ngProgress;
    };

    Search.prototype.nextPage = function() {
        this.ngProgress.height(5);
        this.ngProgress.reset();
        this.ngProgress.start();

        var base_url = 'http://' + window.location.host + window.location.pathname;
        if(base_url.slice(-1) != '/') {
            base_url = base_url + '/';
        }
        var url = base_url + "search.json?offset=" + this.offset;

        $http.get(url).success(function(data) {
            var results = data.results;
            for (var i = 0; i < results.length; i++) {
                this.results.push(results[i]);
            }
            this.offset = this.offset + results.length;
            this.updated = true;
            this.ngProgress.complete();
        }.bind(this));
    };
    return Search;
});

app.directive('updateMasonryContainer', function() {
    return {
        restrict: 'A',
        link: function(scope) {
            if(scope.search.updated) {
                scope.search.updated = false;
                var container = document.querySelector('#masonry-container');
                var msnry;
                // Initialize Masonry after all images have loaded
                imagesLoaded(container, function() {
                    msnry = new Masonry(container);
                });
                scope.ngProgress.complete();
            }
        }
    };
});
