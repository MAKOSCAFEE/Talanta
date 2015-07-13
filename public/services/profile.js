angular.module('MyApp')
    .factory('Profile', ['$resource', function($resource) {
        return $resource('api/users/:id', { id: '@_id' }, {
            'update': {
                method: 'PUT'
            }
        });
    }]);
