var raindropId = 0;
//window.onload = oblako;

angular.module('avenger.services', [])
.factory('Api', ['$http', 'Boot', function($http, Boot){
	return {
		path:'http://raindrop.io/api/',

		get:function(url,callback) {
			$http.get(this.path+url).success( function(json) {
				if (Boot.checkResult(json))
					callback(json);
			}).error( function() {
				var json={result:false};
				callback(json);
			} );
		},
		post:function(url,params,callback) {
			$http({
			  url: this.path+url,
			  method: "POST",
			  data: params,
			  headers: {
				'Content-Type': 'application/json; charset=UTF-8'
			  }
			}).success(function(json, status, headers, config) {
				if (Boot.checkResult(json))
					callback(json);
			}).error( function() {
				var json={result:false};
				callback(json);
			} );
		},
		del:function(url,callback) {
			$http.delete(this.path+url).success( function(json) {
				if (Boot.checkResult(json))
					callback(json);
			}).error( function() {
				var json={result:false};
				callback(json);
			} );
		},
		put:function(url,params,callback) {
			$http({
			  url: this.path+url,
			  method: "PUT",
			  data: params,
			  headers: {
				'Content-Type': 'application/json; charset=UTF-8'
			  }
			}).success(function(json, status, headers, config) {
				if (Boot.checkResult(json))
					callback(json);
			}).error( function() {
				var json={result:false};
				callback(json);
			} );
		}
	}
}])
.factory('Boot', ['$location', function($location){
	return {
		checkResult: function(json) {
			if(json.auth!=undefined){
				$location.url('/auth');
				return false;
			}
			return true;
		}
	}
}])
.filter('fixURL', function() {
	return function(input) {
		if (input.indexOf('/')==0)
			input='http://raindrop.io'+input;
		return input;
	}
})
.filter('humanize', function() {
	return function(input,end) {
		var robot={
			"article_":"Статья"
			,"image_":"Фото"
			,"video_":"Контент"
			,"link_":"Ссылка"
			,"articled":"статью"
			,"imaged":"фото"
			,"videod":"контент"
			,"linkd":"ссылку"
			,"article":"Статьи"
			,"image":"Фото"
			,"video":"Контента"
			,"link":"Ссылки"
		}
		
		if (input!=undefined)
		{
			if (end!=undefined) input+=end;
			for (var val in robot)
				input = input.replace(new RegExp(val, "g"), robot[val]);
		}
	
		return input;
	}
});



var app=angular.module('avenger', ['ngRoute', 'ngAnimate', 'ngCookies', 'avenger.services', 'contenteditable'])
.config(function($routeProvider, $locationProvider) {
	$routeProvider.
		when('/add', {templateUrl: "add.html", controller: Add}).
		when('/auth', {templateUrl: "auth.html", controller: Auth}).
		otherwise({redirectTo: '/add'});
})
.run(function() {

});


/*
    -   -   -   -   /ADD  -   -   -   -
*/
function Add($scope, Api, $cookieStore) {
	oblako();

	$scope.form={
		title:'', excerpt:'', type: 'link'
	};

	var formDefaults=function() {
		$scope.haveScreenshot=false;

		if ($scope.form.cover==undefined)
			$scope.form.cover = 0;

		if ($scope.form.collectionId==undefined)
		$scope.form.collectionId = ( $cookieStore.get('lastCollection') !=undefined ? parseInt($cookieStore.get('lastCollection')) : undefined );

		if (($scope.form.media=='')||($scope.form.media==undefined)) $scope.form.media=[];
		for(var i in $scope.form.media)
			if ($scope.form.media[i].screenshot!=undefined)
				$scope.haveScreenshot=true;

		if ($scope.haveScreenshot==false)
			$scope.form.media.push({link:''});
	}

	$scope.actions={
		homeHeight: 0,
		filter: '',
		orderBy: 'title',
		orderDirection: false,
		loading: false,
		editMode: false,

		currentCollection: function() {
			for(var i in $scope.collections)
				if ($scope.collections[i]['_id']==$scope.form.collectionId)
					return $scope.collections[i]['title'];
			return 'ошибка';
		},
		loadCollections: function(callback) {
			Api.get('collections', function(json) {
				if (json.items!=undefined){
					$scope.collections=json.items;
					localStorage.setItem('collections', JSON.stringify(json.items));
				}
				if (callback!=undefined) callback( json.result );
			} );
		},
		newCollection: function() {
			$scope.actions.loading=true;
			Api.post('collection', {title: $scope.actions.filter}, function(json) {
				if (json.result==true)
					$scope.actions.loadCollections(function(result){
						if (result)
						for(var i in $scope.collections)
							if ($scope.collections[i]['_id']==json.item['_id']){
								$scope.form.collectionId=json.item['_id'];
								$scope.actions.showHome();
								$scope.actions.filter='';
							}
						$scope.actions.loading=false;
					});
				else
					$scope.actions.loading=false;
			});
		},



		saveRaindrop: function() {
			$scope.actions.loading=true;

			if ($scope.form.coverEnabled==false)
				$scope.form.cover='';

			//Указана не существующая коллекция
			Api.get('collection/'+$scope.form.collectionId, function(checkCollectionJSON) {

				if (checkCollectionJSON.result==false) {
					delete $scope.form.collectionId;
					$scope.actions.notification='Укажите существующую коллекцию!';
					$scope.actions.loading=false;
					return false;
				}
				else{
					if ($scope.editMode)
						Api.put('raindrop/'+raindropId, $scope.form, function(json) {
							if (json.result==true)
							{
								Api.post('prepareCover', {id:raindropId}, function() {} );
								oblakoClose(true);
							}
							else
								$scope.actions.notification='Произошла ошибка при сохранение!';

							$scope.actions.loading=false;
						});
					else
						Api.post('raindrop', $scope.form, function(json) {
							if (json.result==true){
								Api.post('prepareCover', {id:json.item['_id']}, function() {} );
								$cookieStore.put('lastCollection', parseInt($scope.form.collectionId));
								oblakoClose(true);
							}
							else
								$scope.actions.notification='Произошла ошибка при сохранение!';

							$scope.actions.loading=false;
						});
				}

			});
		},

		deleteRaindrop: function() {
			$scope.actions.loading=true;
			Api.del('raindrop/'+raindropId, function(json) {
				$scope.actions.loading=false;
				oblakoClose(false);
			});
		},

		checkUrlDublicates: function() {
			$scope.actions.loading=true;

			currentURL( function(url) {
				Api.post('check/url', {url: url}, function(checker) {
					if (checker.id!=undefined){
						$scope.editMode=true;
						raindropId=checker.id;

						Api.get('raindrop/'+checker.id, function(json) {
							$scope.form={
								url: json.item.link,
								title: json.item.title,
								excerpt: json.item.excerpt,
								collectionId: json.item.collection.$id,
								html: json.item.html,
								media: json.item.media,
								id: json.item['_id'],
								type: json.item.type,
								cover: (json.item.coverId!=undefined?json.item.coverId:0),
								coverEnabled: (json.item.cover!='')
							};
							formDefaults();

							$scope.actions.loading=false;
						});
					}
					else {
						$scope.editMode=false;
						raindropId=0;
						$scope.actions.loading=false;
					}
				});
			});
		},



		capturePage: function() {
			makeScreenshot( function(dataURI) {
				if (dataURI) {
					$scope.form.media[ $scope.form.media.length-1 ] = {link: dataURI, type: "image", screenshot: true, dataURI: true};
					$scope.haveScreenshot=true;
					$scope.form.coverId = $scope.form.media.length-1;
					$scope.form.coverEnabled = true;

					try{$scope.$apply();}catch(err){}
				}
			});
		},



		left: function() {
			if ($scope.form.cover>0)
			$scope.form.cover--;
			else
			$scope.form.cover=$scope.form.media.length-1;
		},
		right: function() {
			if ($scope.form.cover>=$scope.form.media.length-1)
			$scope.form.cover=0;
			else
			$scope.form.cover++;
		},

		showHome: function() {
			$scope.step = '';
		},
		showStep: function(step) {
			if (step=='collection')
				$scope.actions.loadCollections();

			$scope.actions.homeHeight = $('.addForm:eq(0)').height();
			$scope.step = step;
		},

		changeOrder: function(order) {
			if (order!=undefined)
				localStorage.setItem('orderBy', order);

			switch(localStorage.getItem("orderBy")){
				case 'lastUpdate':
					$scope.actions.orderBy='lastUpdate';
					$scope.actions.orderDirection=true;
				break;
				default:
					$scope.actions.orderBy='title';
					$scope.actions.orderDirection=false;
				break;
			}
		},

		setFormData: function(data) {
			if (raindropId==0)
			setTimeout( function() {
				$scope.form=data;
				formDefaults();
				try{$scope.$apply();}catch(err){}

				$('#saveRaindropButton').focus();

				postOblako();
			},20);
		}
	};

	$scope.collections = localStorage.getItem("collections");
	if ($scope.collections==null)
		$scope.actions.loadCollections();
	else
		$scope.collections=JSON.parse($scope.collections);

	$scope.actions.changeOrder();

	$scope.actions.checkUrlDublicates();
}


function Auth($scope){

}