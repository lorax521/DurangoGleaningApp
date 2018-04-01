## Durango Gleaning V2

This is a web map application desgined for data collection and basic geoprocessing using carto as the database. It provides 2 geoprocessing functions, finding the x number of nearest points and finding all points within x miles. It also has an edit mode where points can be added/removed from the map. When adding points, a form is used to encode point properties to the carto database.

### Setup
This application is in development stage and requires suffcient changes to work for other databases. However it can be done following the steps below.

To create your own:

1) Go to https://carto.com/ and create a database.
2) In the script.js file update:
2a) The variables cartoDBUserName with your carto username and sqlDB with your carto database name.
2b) The properties you want to show in the popups for functions showAll, showAllWithEdit, nearestPoints, and buffer.
3) If you want to add/remove data points:
3a) In the script.js file update the last line of the variable sql in the function persistOnCartoDB. Add/remove an ARRAY['"+ your_variable + "'] for each property you want to be able to input in the database.
3b) The security-definer-function.sql requres updates in a few places. First, within CREATE OR REPLACE FUNCTION upsertLeafletData(), add/remove the variables you want to encode. Currently, all data types must be stored text[] or deleting the points does not work. Next, add the column names to sql := 'WITH n(). Then, within the LOOP, add/remove your properties CASTing them as text. Following, add your column names to INSERT INTO durango () within the SQL function. Add/remove a n.your_column_name for each property in the following SELECT statement. Finally, add the number of inputs in your function to the last line, GRANT EXECUTE ON FUNCTION upsertLeafletData().
4) To modify your function, the first line, DROP FUNCTION IF EXISTS upsertLeafletData(), will need to mimic the last function created.
5) Paste the entire security-definer-function.sql file into the SQL line in your carto database to make the functions available in your JavaScript.
6) Modify the form in the index.html to match your changes.

### Support or Contact

If you have any trouble or make any significant improvements I would love to hear about it.
