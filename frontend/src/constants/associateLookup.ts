/**
 * Default visible columns for Associate Lookup results.
 * Edit this array to change which columns show by default.
 * All other columns from the query are available in the sidebar picker.
 * NOTE: Keys are lowercase/trimmed — matching is always case-insensitive.
 */
export const DEFAULT_VISIBLE_COLUMNS: string[] = [
  "associateid",
  "businessentityid",
  "firstname",
  "lastname",
  "dmzid",
  "businessentityname",
  "businessentityanswersuid",
];

/**
 * If a column is not in this map, it will display as-is.
 */
export const COLUMN_LABELS: Record<string, string> = {
  associateid: "Associate ID",
  businessentityid: "BEID",
  associateroletypecode: "Role Type",
  firstname: "First Name",
  middleinitial: "Middle Name",
  lastname: "Last Name",
  jobtitle: "Job Title",
  dmzid: "DMZID / Email",
  legacydmzid: "Legacy DMZID",
  isdisabledflag: "Disabled",
  associatelastupdatedatetime: "Associate Updated",
  lastupdatedby: "Updated By",
  certificatedownloaddatetime: "Cert Download Date",
  versionid: "Version",
  isdmzuserflag: "DMZ User",
  accountstartdate: "Account Start",
  accountenddate: "Account End",
  iscertuser: "Cert User",
  associateanswersuid: "Associate Answers UID",
  externalclientrole: "External Role",
  businessentitytypecode: "Entity Type",
  businessentityname: "Organization",
  companynumber: "Company #",
  locationcode: "Location",
  internalexternaltypecode: "Int/Ext Type",
  addressline1: "Address 1",
  addressline2: "Address 2",
  city: "City",
  stateorprovince: "State",
  zipcode: "Zip",
  country: "Country",
  phonenumber: "Phone",
  businessentitylastupdatedatetime: "Org Updated",
  businessentitystatus: "Org Status",
  businessentityanswersuid: "Org UID",
};
