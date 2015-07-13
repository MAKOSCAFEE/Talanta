angular.module('MyApp')
  .factory('UserUpdate', function($resource) {
    return $resource('/api/users/:id' { id: '@_id' }, {
    update: {
      method: 'PUT' // this method issues a PUT request
    }
  });
    
  });