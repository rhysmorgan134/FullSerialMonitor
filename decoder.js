const { exec, execSync } = require("child_process");
var decoder_folder = document.getElementById("decoder_folder");
var decoder_folder_input = document.getElementById("decoder_folder_input");
var decoder_arch = document.getElementById("decoder_arch");
var decoder_color = document.getElementById("decoder_color");
var elf_path = document.getElementById("elf_path");
var elf_path_input = document.getElementById("elf_path_input");
var elf_error_warning = false;
var elf_file_auto_path = "";

//"C:\Users\benja\AppData\Local\Arduino15\packages\esp32\tools\xtensa-esp32-elf-gcc\gcc8_4_0-esp-2021r2-patch3\bin\xtensa-esp32-elf-addr2line.exe"
var addr2line_path = "packages\\esp32\\tools\\xtensa-esp32-elf-gcc\\gcc8_4_0-esp-2021r2-patch3\\bin\\xtensa-esp32-elf-addr2line.exe";
var memory_address = null;
var esp32_version = "";
var esp32_gcc_version = "";
//xtensa-esp32-elf-addr2line -pfiaC -e build/PROJECT.elf ADDRESS

function decodeBacktrace(backtraceDecoder_input, backtraceDecoder_input_line, timestamp) {
    if (elf_path_input.value != "") {
        var backtraceResult = document.createElement("a");
        backtraceResult.setAttribute("id", "p" + backtraceDecoder_input_line);
        var index = backtraceDecoder_input.indexOf(" ");
        var lastIndex = 0;
        var m_length = backtraceDecoder_input.length;
        while (index > -1) {
            memory_address = backtraceDecoder_input.substring(lastIndex, index);
            lastIndex = index + 1;
            index = backtraceDecoder_input.indexOf(" ", lastIndex);
            if (!memory_address.startsWith("Backtrace")) {
                var command = preferences.decoderFolder + addr2line_path + " -pfiaC -e " + elf_path_input.value.trim() + " " + memory_address;
                try {
                    var stdout = execSync(command).toString();
                    backtraceResult.innerHTML += stdout + "<br>";
                }
                catch (stderr) {
                    backtraceResult.innerHTML += stderr + "<br>";
                }
            }
        }
        memory_address = backtraceDecoder_input.substring(lastIndex, m_length - 1);
        if (!memory_address.startsWith("Backtrace")) {
            var command = preferences.decoderFolder + addr2line_path + " -pfiaC -e " + elf_path_input.value + " " + memory_address;
            try {
                var stdout = execSync(command).toString();
                backtraceResult.innerHTML += stdout + "<br>";
            }
            catch (stderr) {
                backtraceResult.innerHTML += stderr + "<br>";
            }
            addParserResult(backtraceResult, backtraceDecoder_input, preferences.decoderColor, "expDecoder", timestamp);
            return;
        }
    }
    else {
        if (!elf_error_warning) {
            elf_error_warning = true;
            window.alert("Backtrace could not be parsed, choose .elf file please");
        }
        return "No ELF file given";
    }
}

function syntaxHighlightDecoder(decoded) {
    decoded = decoded.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return decoded.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

function getESPaddr2line() {
    var hardwareFolder = preferences.decoderFolder + "packages\\esp32\\hardware\\esp32\\";
    fs.readdir(hardwareFolder, (err, files) => {
        if (err) {
            console.log(err);
            return;
        }
        files.forEach(file => {
            esp32_version = file;
            fs.readFile(hardwareFolder + esp32_version + "\\installed.json", 'utf8', (err, data) => {
                if (err) {
                    console.log(err);
                    return;
                }
                var installed_json = JSON.parse(data);
                esp32_gcc_version = installed_json.packages[0].platforms[0].toolsDependencies[0].version;
                addr2line_path = "packages\\esp32\\tools\\xtensa-esp32-elf-gcc\\" + esp32_gcc_version + "\\bin\\xtensa-esp32-elf-addr2line.exe";
            });
        });
    });
    getSketchBuild();
    elf_path_input.value = elf_file_auto_path;
}

function getSketchBuild() {
    var localFolder = preferences.decoderFolder.split("Arduino15")[0] + 'Temp';
    console.log(localFolder);
    var mostRecentBuild = "";
    var mostRecentTimestamp = 0;
    var files = fs.readdirSync(localFolder);
    files.forEach(file => {
        var stats = fs.lstatSync(localFolder + '\\' + file);
        if (stats.isDirectory() && file.startsWith("arduino-sketch")) {
            if (stats.mtimeMs > mostRecentTimestamp) {
                mostRecentTimestamp = stats.mtimeMs;
                console.log(file, ': ', stats.mtimeMs);
                mostRecentBuild = file;
            }
        }
    });
    if (mostRecentBuild != "") {
        console.log('Sketch build folder: ', mostRecentBuild);
        var filesSketch = fs.readdirSync(localFolder + '\\' + mostRecentBuild);
        filesSketch.forEach(file => {
            console.log(file);
            if (file.endsWith("ino.elf")) {
                elf_file_auto_path = localFolder + '\\' + mostRecentBuild + '\\' + file;
                console.log(elf_file_auto_path);
            }
        });
    }
}
