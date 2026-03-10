default:
  @just --list

setup:
  mix deps.get
  mix tailwind.install

clean:
  rm -rf _site

serve:
  mix tableau.server

prod-build: clean
  MIX_ENV=prod mix build
