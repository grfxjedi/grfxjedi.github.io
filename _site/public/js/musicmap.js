(function(){
	$(window).load(function() {
		$('body').addClass('pageReady');
	});
	$(document).ready(function() {
		
		$('#searchTypeList a').on('click', function(){
			var newSearchType = $(this).html();
			$('#searchTypeList li').removeClass('active');
			$(this).parent().addClass('active');
			$('#searchType').html(newSearchType);
		});
		$('#searchMusic').on('submit', function(e) {
			e.preventDefault();
			$('#content .alert').removeClass('warning');
			$('#info').html('');
			$('#calendar h3').html('');
			$('#calendar ul').html('');

//console.log($('#searchTypeList li.active a').attr('data-nav'));

			switch($('#searchTypeList li.active a').attr('data-nav')) {
				case 'artist':
					mm.search.findArtist($(this).find('input').val());
					break;
				case 'genre':
					break;
				case 'location':
					break;
			}


		})
	});

	mm = {};
	mm.search = {};
	mm.search.key = 'MPXp4fdMwHLVhDnS';
	mm.search.artist = {};
	mm.search.events = {};
	
	mm.displayMap = {};
	mm.displayMap.map = {};
	mm.displayMap.type = "";
	mm.displayMap.locations = [];
	mm.displayMap.boundingbox = [];
	mm.displayMap.pins = [];
	mm.displayMap.pinNum = 0;
	mm.displayMap.flyout = {};
	mm.displayMap.heatmap = {};
	mm.displayMap.heatData = [];
//	endpoint = "http://10.7.20.81:9000";
//	endpoint = "http://localhost:9000";

	artistViewTemplate = $("#artist_view");
	artistViewTemplate = _.template( artistViewTemplate.html() );
	calendarViewTemplate = $("#calendar_view");
	calendarViewTemplate = _.template( calendarViewTemplate.html() );
	flyoutViewTemplate = $("#flyout_view");
	flyoutViewTemplate = _.template( flyoutViewTemplate.html() );
	venueViewTemplate = $("#venue_view");
	venueViewTemplate = _.template( venueViewTemplate.html() );

	mm.dateConversion = function(dateString) {
		var eventDate = dateString.split(' ');
		eventDate[0] = eventDate[0].split('-');
		eventDate[1] = eventDate[1].split(':');
		eventDate = new Date(eventDate[0][0], parseInt(eventDate[0][1]) - 1, eventDate[0][2], eventDate[1][0], eventDate[1][1], eventDate[1][2]).toLocaleDateString();
		return eventDate;
	};

	mm.search.findArtist = function(artistName) {
		var urlEventful = 'http://api.eventful.com/json/performers/search?app_key=' + mm.search.key + '&keywords=' + artistName.toLowerCase() + '&sort_order=name';

//console.log(urlEventful);

		$.ajax({
			method: 'get',
			dataType: 'jsonp',
			url: urlEventful,
			success: function(xhr) {
				if (xhr.total_items === '1') {
					mm.search.artist = xhr.performers.performer;
				} else if (xhr.total_items === '0') {
					$('#content .alert').addClass('warning');
					$('#content .alert span').html('Couldn’t find <b>' + artistName + '</b>. Please try your search again.');
				} else {
					mm.search.artist = xhr.performers.performer[0];
					$('#content .alert').addClass('warning');
					$('#content .alert span').text('Found ' + xhr.total_items + ' artists, try to be more specific.');
				}

				if (xhr.total_items > 0) {
					artistView = artistViewTemplate(mm.search.artist);
					$('#info').html(artistView);
					mm.search.findArtistDetails();
				}
			}
		});
	};
	mm.search.findArtistDetails = function() {
		var urlEventful = 'http://api.eventful.com/json/performers/get?app_key=' + mm.search.key + '&id=' + mm.search.artist.id + '&&image_sizes=perspectivecrop290by250,whiteborder500';

//console.log(urlEventful);

		$.ajax({
			method: 'get',
			dataType: 'jsonp',
			url: urlEventful,
			success: function(xhr) {
				if (xhr.long_bio) {
					mm.search.artist.long_bio = xhr.long_bio;
					$('#moreInfo .bio span').html(mm.search.artist.long_bio);
				} else {
					$('#moreInfo .bio span').html(mm.search.artist.short_bio);
				}
				
				var artistImage;
				if (xhr.images.image.length) {
					artistImage = xhr.images.image[0];
				} else {
					artistImage = xhr.images.image;
				}
				$('#info .photo img').attr('src', artistImage.perspectivecrop290by250.url);
				$('#moreInfo .bio .photo').html('<img alt="' + xhr.name + '" src="' + artistImage.whiteborder500.url + '" />');
				
				mm.search.findArtistEvents();
			}
		});
	};
	mm.search.findArtistEvents = function() {
		var urlEventful = 'http://api.eventful.com/json/performers/events/list?app_key=' + mm.search.key + '&id=' + mm.search.artist.id + '&page_size=100';

//console.log(urlEventful);

		$.ajax({
			method: 'get',
			dataType: 'jsonp',
			url: urlEventful,
			success: function(xhr) {
				if (parseInt(xhr.event_count) > 0) {
					$('#calendar h3').prepend('Tour dates and locations');
					if (parseInt(xhr.event_count) === 1) {
						mm.search.events = new Array(xhr.event);
					} else {
						mm.search.events = xhr.event;
					}
					
					for ( i = 0; i < mm.search.events.length; i++ ) {
						mm.search.events[i].eventDate = mm.dateConversion(mm.search.events[i].start_time);
						calendarView = calendarViewTemplate(mm.search.events[i]);
						$('#calendar ul').append(calendarView);
					}
					
					mm.displayMap.getLocations();
				} else {
					mm.displayMap.reset();
				}
			}
		});
	};
	mm.search.findVenue = function(venueID, eventID) {
		var urlEventful = 'http://api.eventful.com/json/venues/get?app_key=' + mm.search.key + '&id=' + venueID + '&image_sizes=medium,blackborder500';

//console.log(urlEventful);

		$.ajax({
			method: 'get',
			dataType: 'jsonp',
			url: urlEventful,
			success: function(xhr) {
				venueView = venueViewTemplate(xhr);
				$('#eventModal' + eventID + ' .modal-body').html(venueView);

//console.log(xhr);

			}
		});
	};

	mm.displayMap.initialize = function() {
		mm.displayMap.map = new google.maps.Map(document.getElementById('displayMap'), {
			center: new google.maps.LatLng(38.50419608597645, -95.48702973127354),
			zoom: 4,
			mapTypeId: google.maps.MapTypeId.ROADMAP
		});
		
		mm.displayMap.boundingbox = new google.maps.LatLngBounds();
	};
	mm.displayMap.reset = function() {
		mm.displayMap.boundingbox = new google.maps.LatLngBounds();
		mm.displayMap.locations = [];
		for ( i = 0; i < mm.displayMap.pins.length; i++ ) {
			mm.displayMap.pins[i].setMap(null);
		}
		mm.displayMap.pins = [];
		mm.displayMap.pinNum = 0;
		mm.displayMap.map.setCenter(new google.maps.LatLng(38.50419608597645, -95.48702973127354));
		mm.displayMap.map.setZoom(4);
	};

	mm.displayMap.getLocations = function() {

		if (mm.displayMap.locations.length > 0) {
			mm.displayMap.reset();
		}

		for ( i = 0; i < mm.search.events.length; i++ ) {
			var urlEventful = 'http://api.eventful.com/json/events/get?app_key=' + mm.search.key + '&id=' + mm.search.events[i].id + '&image_sizes=medium,whiteborder500';

//console.log(i + " - " + urlEventful);

			$.ajax({
				method: 'get',
				dataType: 'jsonp',
				url: urlEventful,
				success: function(xhr) {
					xhr.start_time = mm.dateConversion(xhr.start_time);
					
					mm.displayMap.locations.push(xhr);
					$('#eventModal' + xhr.id + ' .modal-header h4').html(xhr.venue_name);
					mm.search.findVenue(xhr.venue_id, xhr.id);
					
					if (mm.displayMap.locations.length === mm.search.events.length) {
						mm.displayMap.plotLocations();
					}
				}
			});
		}
	};
	mm.displayMap.plotLocations = function() {
		for ( i = 0; i < mm.displayMap.locations.length; i++ ) {
			var LatLng = new google.maps.LatLng(mm.displayMap.locations[i].latitude, mm.displayMap.locations[i].longitude);
			mm.displayMap.boundingbox.extend(LatLng);
			
			setTimeout(function() {
				mm.displayMap.addPins();
			}, i * 300);
		}
	};
	

	mm.displayMap.addPins = function() {
		var LatLng = new google.maps.LatLng(mm.displayMap.locations[mm.displayMap.pinNum].latitude, mm.displayMap.locations[mm.displayMap.pinNum].longitude);
		mm.displayMap.map.setCenter(LatLng);

		var marker = new google.maps.Marker({
			position: LatLng,
			map: mm.displayMap.map,
			draggable: false,
			title: mm.displayMap.locations[mm.displayMap.pinNum].title,
			content: flyoutViewTemplate(mm.displayMap.locations[mm.displayMap.pinNum]),
			animation: google.maps.Animation.DROP
		});
		
		mm.displayMap.pins.push(marker);
		
		google.maps.event.addListener(marker, 'click', function() {
			if (mm.displayMap.flyout.close) {
				mm.displayMap.flyout.close();
			}
			
			mm.displayMap.flyout = new google.maps.InfoWindow({
				maxWidth: 440,
				title: marker.title,
				content: marker.content
			});
			mm.displayMap.flyout.open(mm.displayMap.map, marker);

		});
		
		mm.displayMap.pinNum++;
		
		if (mm.displayMap.locations.length === mm.displayMap.pinNum) {
			if (mm.displayMap.locations.length > 1) {
				mm.displayMap.map.fitBounds( mm.displayMap.boundingbox );
			} else {
				mm.displayMap.map.setCenter(LatLng);
				mm.displayMap.map.setZoom(11);
			}
		}
	};
	
})();

