/* Microstache minimal templating module by RationalCoding */

/*

Takes an HTML string with mustache notation in it:

"<h1>{{ title }}</h1>"

and a data object:

{
    title : "My Title!"
}

and returns the templated result:

"<h1>My Title!</h1>"


Simple! (Those regexes were NOT)

*/

var Microstache = (function (my) {
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