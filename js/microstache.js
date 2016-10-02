/* MicroMustache minimal templating module by RationalCoding */
var MicroMustache = (function (my) {
    my.template = function (htmlTemplate, data) {
        var keys = Object.keys(data).map(function (e) {
            return "{{\\s*" + e + "\\s*}}"
        }).join("|");
        var rendered;
        if (!!keys) {
            var re = new RegExp(keys, "gi");
            rendered = htmlTemplate.replace(re, function (m) {
                var re = /{{\s*([^\s]*)\s*}}/g;
                return data[re.exec(m)[1]]
            });
        } else {
            rendered = htmlTemplate;
        }
        var cleaned = rendered.replace(/{{[^}}]*}}/gi, "");
        return cleaned;
    }
    return my;
}({}));