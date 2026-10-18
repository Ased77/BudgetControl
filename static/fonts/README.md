# IRANSansX webfonts live in this directory.
#
# Files present (sourced from the public salmankasaei-debug/IRANSansX mirror):
#   IRANSansX-Regular.woff2 -> aliased to weights 100–500
#   IRANSansX-Bold.woff2    -> aliased to weights 600–900
#
# These names are referenced by src/index.css (app) and src/utils/pdfExport.ts
# (print/PDF report). Rename a file and both places must be updated.
#
# The distribution only ships Regular and Bold; if you obtain the full
# ExtraBold/Black cuts, add them here and narrow the 600–900 range in
# src/index.css so the heavier weights render as designed.
