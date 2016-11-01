/*
 *   DOM manipulation shortcut library.
 *   Thomas Mullen 2016
 *   LICENSE: MIT
 *
 *
 *   Usage:
 *   Query Selector:    var el = $("div > p")
 *   First match:       $.first("div > p")
 *   Wait for ready:    $.onReady(function(){ // Do stuff });
 *   Add event          $.event("div", "click", function(){ // Do stuff });
 *   Change style       $.style("div", "display", "none");
 *   Get style          $.style("div", "display");
 *
 *
 *   Functions can be passed a query string or a DOM node
 *   e.g) $.style("div", "display"); or $.style($("div"), "display");
 */


var $ = (function (my) {

    my = function (queryString) {
        var result = document.querySelectorAll(queryString);
        if (result.length === 0) {
            return null;
        } else if (result.length === 1) {
            return result[0];
        } else {
            return result;
        }
    }
    
    my.first = function (queryString) {
        return document.querySelector(queryString);
    }
    
    //Instead of extending the DOM, this is much faster
    my.event = function(element, eventName, fn){
        element = (typeof element === 'string') ? my(element) : element;
        if (element.length){
            // Multiple elements
            for (var i=0; i<element.length; i++){
                element[i].addEventListener(eventName, fn);
            }
        }else{
            element.addEventListener(eventName, fn);
        }
    }
    
    my.style = function(element, propertyName, value){
        element = (typeof element === 'string') ? my(element) : element;
        if (element && element.length){
            //Multiple elements
            var result = [];
            for (var i=0; i<element.length; i++){
                if (value !== undefined && value !== null){
                    element[i].style[propertyName]=value;
                }
                result.push(element[i].style[propertyName]);
            }
            return result;
            
        }else{
            if (value !== undefined && value !== null){
                element.style[propertyName]=value;
            }
            return element.style[propertyName];
        }
        
    }
    
    my.onReady = function(fn){
        document.addEventListener("DOMContentLoaded", function(event) { 
            fn();
        });
    }


    return my;
}({}))