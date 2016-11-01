Contributing
================================================================================

Awesome!  I'm happy that you want to contribute.

Make sure that you're read and understand the [Code of Conduct](CODE_OF_CONDUCT.md).


Building from source
--------------------------------------------------------------------------------

If you want to modify the source to play with it, you'll also want to have the
`jbuild` program installed.

To install `jbuild`, use the command

```text
npm -g install jbuild
```

The `jbuild` command runs tasks defined in the `jbuild.coffee` file.  The
task you will most likely use is `watch`, which you can run with the
command:

```text
jbuild watch
```

When you run this command, the application will be built from source, the server
started, and tests run.  When you subsequently edit and then save one of the
source files, the application will be re-built, the server re-started, and the
tests re-run.  For ever.  Use Ctrl-C to exit the `jbuild watch` loop.

You can run those build, server, and test tasks separately.  Run `jbuild`
with no arguments to see what tasks are available, along with a short
description of them.


GitHub usage
--------------------------------------------------------------------------------

* Develop major features on feature branches, and submit PRs to `master`.

* Never force push onto `master`.
