/**
 * Legacy compatibility component.
 *
 * ELIO no longer uses the old BrandLogoManager system. Keeping this
 * harmless component prevents TypeScript from failing if the legacy file
 * is still present in src/store. Do not import it into the active app.
 */
function BrandLogoManager() {
  return null;
}

export default BrandLogoManager;
