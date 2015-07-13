angular.module('MyApp')
  .factory('PostId', ['$resource','Auth',function($resource,Auth) {
    return $resource('/api/posts/:id');
  }]);


angular.module('MyApp')
  .factory('Posts', ['$resource','Auth',function($resource,Auth) {
    return $resource('/api/discover/');
  }]);
