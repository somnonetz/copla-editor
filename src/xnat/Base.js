import _ from 'lodash';
import * as utils from './utils';
import Resource from './Resource';

export default class Base {

   // TODO implement
   // getResources {
   //    return utils.getChildren(Resource)
   // }

   createResource(data) {
      const parentURL = utils.tpl(this.constructor.urls.one, this.data);
      const newData = _.defaults({ parentURL }, data);
      return utils.createChild(Resource).call(this, newData);
   }

}
