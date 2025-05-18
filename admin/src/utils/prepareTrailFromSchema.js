// A simplified version of server/utils/prepareTrailFromSchema.js for client-side use
const prepareTrailFromSchema = (update, schema) => {
  /**
   * Ignore the default strapi fields to focus on custom fields
   */
  const ignoreProps = [
    'id',
    'createdAt',
    'updatedAt',
    'createdBy',
    'updatedBy',
    'password' // For security
  ];

  /**
   * Walk the update object and create our trail
   */

  let trail = {};
  let ignored = {};
  
  if (update && typeof update === 'object' && Object.keys(update).length > 0) {
    Object.keys(update).forEach(key => {
      if (schema?.attributes && schema.attributes.hasOwnProperty(key) && !ignoreProps.includes(key)) {
        trail[key] = update[key];
      } else {
        ignored[key] = update[key];
      }
    });
  }

  return { trail, ignored };
};

export default prepareTrailFromSchema;