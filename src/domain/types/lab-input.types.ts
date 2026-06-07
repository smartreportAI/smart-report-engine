/**
 * Raw Lab Input Types
 *
 * These types represent the actual JSON format that labs send.
 * Same structure as what Remedies accepts from clients like
 * Rajagiri, Medibuddy, Paras, etc.
 */

export interface LabObservation {
  /** Test parameter name (e.g. "Haemoglobin", "Total Cholesterol") */
  name: string;
  /** NirogGyan parameter ID (e.g. "NGPM0106") — used for mapping */
  id: string;
  /** Test result value (may be numeric string or text like "ABSENT") */
  value: string;
  /** Minimum reference range value (as string from lab system) */
  MinValue: string;
  /** Maximum reference range value (as string from lab system) */
  MaxValue: string;
  /** Unit of measurement (e.g. "mg/dL", "%") */
  unit: string;
  /** Testing method used (e.g. "Photometric method") */
  method?: string;
  /** Date/time of observation */
  observation_time?: string;
  /** Doctor's impression/comment */
  impression?: string;
  /** Display value override (some labs send a formatted range text) */
  DisplayValue?: string;
  /** NABL accreditation flag */
  isNabl?: number;
  /** CAP accreditation flag */
  isCAP?: number;
  /** NGSP accreditation flag */
  isNGSP?: number;
  /** Custom flag for special impressions */
  flag?: string;
  /** Historical past observations for trend charts */
  pastObservation?: LabPastObservation[];
}

export interface LabPastObservation {
  value: string;
  date: string;
  MinValue?: string;
  MaxValue?: string;
}

export interface LabInvestigation {
  /** Test panel name (e.g. "Complete Haemogram (CBC)") */
  test_name: string;
  /** Lab-specific test code */
  test_code?: string;
  /** Barcode number for this sample */
  barcodeNo?: string;
  /** Sample type (e.g. "Blood", "Serum", "Urine") */
  SampleType?: string;
  /** Sample collection date */
  SampleCollDate?: string;
  /** Sample received date */
  SampleRcvDate?: string;
  /** Report approval date */
  ApprovalDate?: string;
  /** Sample collected by */
  SampleCollBy?: string;
  /** Sample received by */
  SampleRcvBy?: string;
  /** Approving doctor ID */
  ApprovedByDoctorID?: string;
  /** NABL accreditation for this investigation */
  isNABL?: number;
  /** Comments from the lab */
  Comments?: string;
  /** The actual test results */
  observations: LabObservation[];
}

export interface LabResult {
  /** Package name (e.g. "Gold Preventive Health Checkup - Female") */
  Package_name?: string;
  /** Package booking code */
  Package_book_code?: string;
  /** Investigations within this package */
  investigation?: LabInvestigation[];
  /** Some labs use "Investigation" (capital I) */
  Investigation?: LabInvestigation[];
}

/**
 * The raw JSON that a lab sends to generate a Smart Report.
 * This is the format Remedies currently accepts.
 */
export interface LabInput {
  /** Organization identifier (e.g. "rajagiri", "medibuddy") */
  org: string;
  /** Centre/branch identifier */
  Centre: string;
  /** Work order ID */
  WorkOrderID?: string;
  /** Lab number / report number */
  LabNo?: string;
  /** Patient name */
  PName: string;
  /** Patient gender ("M", "F", "Male", "Female") */
  Gender: string;
  /** Patient age (can be string like "35" or "35 Years") */
  Age: string | number;
  /** Referring doctor name */
  ReferredBy?: string;
  /** Patient mobile number */
  patientMobile?: string;
  /** Patient category (e.g. "OP (Health Checkup)") */
  patientCategory?: string;
  /** QR code URL (client-provided) */
  qrURL?: string;
  /** Whether historical/past data is included */
  hasPastData?: boolean;
  /** IP number (inpatient) */
  'IP No'?: string;
  /** Lab test results grouped by package */
  results: LabResult[];
}
