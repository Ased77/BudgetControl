# IRANSansX webfonts live in this directory.
#
# Expected file names (woff2, served from the web root as /fonts/<name>):
#   IRANSansX-Regular.woff2     -> weight 400
#   IRANSansX-Medium.woff2      -> weight 500
#   IRANSansX-DemiBold.woff2    -> weight 600
#   IRANSansX-Bold.woff2        -> weight 700
#   IRANSansX-ExtraBold.woff2   -> weight 800
#   IRANSansX-Black.woff2       -> weight 900
#
# These names are referenced by src/index.css (app) and src/utils/pdfExport.ts
# (print/PDF report). Rename a file and both places must be updated.
#
# Missing weights degrade gracefully: CSS font matching uses the nearest real
# face instead (and font-synthesis-weight is disabled, so nothing is faux-bolded).
