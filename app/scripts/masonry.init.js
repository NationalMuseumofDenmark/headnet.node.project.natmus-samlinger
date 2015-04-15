'use strict';

// Initiate masonry & infinite scroll on relevant pages
$(function() {

	var $container = $('#masonry-container');

	$container.imagesLoaded(function(){
		$container.each(function() {
			var masonry = new Masonry( this, {
				itemSelector: '.box'
			});
			$container.data('masonry', masonry);
		});
	});

	$container.infinitescroll({
		navSelector  : '#page-nav',    // selector for the paged navigation
		nextSelector : '#page-nav a',  // selector for the NEXT link (to page 2)
		itemSelector : '.box',     // selector for all items you'll retrieve
		loading: {
			finishedMsg: 'Ikke flere resultater...',
			img: '/images/loading.gif',
			msgText: 'Henter flere resultater...',
			speed: 0,
		},
		animate:false
	},
	// trigger Masonry as a callback
	function( newElements, opts ) {
		// Change the location hash
		if(history) {
			// We need to clone this, for the reset of css to not affect the dom.
			var $searchResult = $container.clone();
			// Reset the CSS position, left and top properties.
			$searchResult.children().each(function() {
				$(this).css({
					position: '',
					left: '',
					top: ''
				});
			});
			var state = {
				page: opts.state.currPage,
				search_result: $searchResult.html()
			};
			// Push this state to the history.
			history.replaceState(state);
		}

		// hide new items while they are loading
		var $newElems = $( newElements ).css({ opacity: 0 });
		// ensure that images load before adding to masonry layout
		$newElems.imagesLoaded(function(){
			// show elems now they're ready
			$newElems.animate({ opacity: 1 });
			var masonry = $container.data('masonry');
			masonry.appended( $newElems, true );
			$('#more').show();
		});
	});

	// We are not interested in the infinite scrolling working automatically.
	$container.infinitescroll('unbind');

	$("#more").click(function(){
			$('#more').hide();
			var $container = $('#masonry-container');
			$container.infinitescroll('retrieve');
			return false;
	});

	// When navigating back to a search that has already paginated.
	window.onpopstate = function(event) {
		var page = event.state.page;
		var search_result = event.state.search_result;
		// If we have a page and a search result
		if(search_result && page) {
			// Substitude the loaded search result.
			$container
				.empty()
				.html(search_result)
				.children()
				.css({ opacity: 0 });
			// Make sure to change the infinitescroll page.
			$container.infinitescroll('update', {state: {currPage: page}});
			// Tell masonry to reorganise the results.
			$container.imagesLoaded(function() {
				// Destroy and recreate the masonry plugin.
				var masonry = $container.data('masonry');
				masonry.destroy();
				masonry = new Masonry( $container.get(0), {
					itemSelector: '.box'
				} );
				$container.data('masonry', masonry);
				// Show the search results when they have been rearranged.
				$container
					.children()
					.css({ opacity: 1 });
			});
		}
	};

});
