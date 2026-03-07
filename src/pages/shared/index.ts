/**
 * Shared components barrel — re-export all shared components
 * so pages import from one place.
 */

export { renderPageHeader, renderCoverHeader } from './components/header.component';
export { renderPageFooter, renderDisclaimerFooter } from './components/footer.component';
export { renderPatientHeader } from './components/patient-header.component';
export { renderScoreGauge, renderParamGauge } from './components/speedometer.component';
export { renderSmartSlider } from './components/slider.component';
export type { FooterOptions } from './components/footer.component';
export type { PatientHeaderOptions } from './components/patient-header.component';
export type { ScoreGaugeOptions, ParamGaugeOptions } from './components/speedometer.component';
export type { SmartSliderOptions } from './components/slider.component';
