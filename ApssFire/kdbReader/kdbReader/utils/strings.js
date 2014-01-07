(function() {
    "use strict";

    var KeePass = window.KeePass || {},
        S = KeePass.strings = KeePass.strings || {};

    S.creating_key = "Creating database key...";
    S.transforming_key = "Transforming key %d%...";
    S.decrypting_db = "Decrypting database contents...";
    S.verifying_contents = "Verifying database contents...";
    S.loading_contents = "Loading database contents...";
    S.error_invalid_key = "Invalid key.";
    S.error_failed_to_open = "Failed to open database.";
    S.error_bad_file_size = "Invalid file size.";
    S.error_empty_db = "Database empty.";
    S.error_unsupported_version = "Unsupported file version.";
    S.error_bad_signature = "Invalid file signature";
    S.error_unsupported_file = "Unsupported file.";
    S.error_unknown_field_type = "Unknown field type.";
    S.error_padding_data_mismatch = "Padding data mismatch";
}());