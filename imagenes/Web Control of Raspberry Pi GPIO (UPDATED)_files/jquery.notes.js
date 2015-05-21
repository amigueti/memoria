!function($) {
  $.fn.notes = function(method) {
    var methods;
    methods = {};
    methods.init = function(options, editable, container) {
      methods.setEditable(editable);
      return this.each(function() {
        var noteHolder, self;
        self = $(this);
        noteHolder = $('<div class="note-holder"></div>');
        return setTimeout(function() {
          var makeOptions, nfo, option, _i, _len, _results;
          nfo = methods.extractInfo(self, container);
          noteHolder.addClass(nfo.imgId);
          noteHolder.attr("id", "holder_" + nfo.imgId);
          methods.placeNoteHolder(noteHolder, nfo);
          if (container != null) {
            container.append(noteHolder);
          } else {
            $("body").append(noteHolder);
          }
          if (methods.editable) {
            noteHolder.css({
              "z-index": 200
            });
            methods.bindNoteHolder(noteHolder);
          }
          makeOptions = function(opt) {
            var literal;
            opt.parentWidth = nfo.width;
            opt.parentHeight = nfo.height;
            opt.noteHolder = noteHolder;
            literal = [opt];
            return methods.display.apply(self, literal);
          };
          if (options) {
            _results = [];
            for (_i = 0, _len = options.length; _i < _len; _i++) {
              option = options[_i];
              _results.push(makeOptions(option));
            }
            return _results;
          }
        }, 10);
      });
    };
    methods.extractInfo = function(elm, container) {
      var compoundClass, eclass, height, imgId, offset, width;
      width = elm.width();
      height = elm.height();
      eclass = elm.attr('class');
      offset = container ? elm.offsetParent().position() : elm.offset();
      if (eclass != null) {
        compoundClass = eclass.indexOf(' ');
      }
      if ((compoundClass != null) && compoundClass !== -1) {
        imgId = eclass.split(' ')[1];
      } else {
        imgId = eclass;
      }
      return {
        width: width,
        height: height,
        offset: offset,
        imgId: imgId
      };
    };
    methods.placeNoteHolder = function(noteHolder, nfo) {
      if ((nfo != null) && (nfo.offset != null)) {
        return noteHolder.css({
          left: nfo.offset.left + "px",
          top: nfo.offset.top + "px",
          width: nfo.width + "px",
          height: nfo.height + "px"
        });
      }
    };
    methods.buildNoteInfo = function(note, action) {
      var data, height, hheight, holder, hwidth, imgId, left, pos, text, top, width;
      pos = note.position();
      holder = note.parent();
      hwidth = holder.width();
      hheight = holder.height();
      imgId = holder.attr('class').split(" ")[1].substring(3);
      data = {};
      data.action = action;
      data.imageID = imgId;
      top = pos.top / hheight;
      left = pos.left / hwidth;
      width = note.width() / hwidth;
      height = note.height() / hheight;
      text = note.find("textarea").val();
      if (!text) {
        text = note.find(".note-text-value").html();
      }
      if (text) {
        data.text = text.replace(/\n/g, '<br/>').replace(/"/g, '\\"');
      }
      data.json = '{"top":' + top + ',"left":' + left + ',"width":' + width + ',"height":' + height + ',"text":"' + data.text + '"}';
      return data;
    };
    methods.add = function(note) {
      var data;
      data = methods.buildNoteInfo(note, "ADD");
      return $.post("/ajax/imageNote", data, function(response) {
        note.attr('id', response);
        note.find(".note-text").html(methods.buildTextNode(data.text.replace(/\\"/g, '"')));
        return methods.bind(note);
      }, "text");
    };
    methods.buildTextNode = function(text) {
      return $('<div class="note-text-value">' + text + '</div><a class="edit-note" href="#">edit</a>');
    };
    methods.buildEditNode = function(text, classname) {
      text = text.replace(/<br>/g, '\n');
      if (!classname) {
        return $('<textarea>' + text + '</textarea><br/><a class="delete little-button" href="#">delete</a><a class="save little-button" href="#">save</a>');
      } else {
        return $('<textarea>' + text + '</textarea><br/><a class="delete little-button" href="#">delete</a><a class="' + classname + ' little-button" href="#">save</a>');
      }
    };
    methods.save = function(note) {
      var data;
      data = methods.buildNoteInfo(note, "MODIFY");
      data.noteID = note.attr("id");
      if (data.noteID) {
        return $.post("/ajax/imageNote", data, function(response) {
          return methods.bind(note);
        });
      }
    };
    methods.update = function(note) {
      var noteText, text;
      noteText = note.find(".note-text");
      text = noteText.find('.note-text-value').html();
      noteText.html(methods.buildEditNode(text, "edit"));
      methods.bind(note);
      return noteText.find('a.edit').click(function(evt) {
        var data;
        evt.preventDefault();
        data = methods.buildNoteInfo(note, "MODIFY");
        if (data.text != null) {
          data.noteID = note.attr("id");
          return $.post("/ajax/imageNote", data, function(response) {
            noteText.html(methods.buildTextNode(noteText.find('textarea').val()));
            return methods.bind(note);
          });
        } else {
          return feedBack.add("Please enter text in order to save.");
        }
      });
    };
    methods.remove = function(note) {
      var data;
      data = methods.buildNoteInfo(note, "DELETE");
      data.noteID = note.attr("id");
      if (data.noteID) {
        $.post("/ajax/imageNote", data);
      }
      return note.fadeOut(function() {
        return note.remove();
      });
    };
    methods.bindNoteHolder = function(holder) {
      var note;
      note = null;
      $("div.note-holder").mousedown(function(evt) {
        evt.preventDefault();
        note = methods.userCreateBox(evt, holder);
        return methods.bind(note, note.height());
      });
      return this;
    };
    methods.display = function(note) {
      var left, noteHeight, noteWidth, top;
      left = Math.round(note.parentWidth * note.left);
      top = Math.round(note.parentHeight * note.top);
      noteWidth = Math.round(note.parentWidth * note.width);
      noteHeight = Math.round(note.parentHeight * note.height);
      methods.drawBox({
        left: left,
        top: top,
        width: noteWidth,
        height: noteHeight,
        note: note
      });
      return this;
    };
    methods.drawBox = function(opts) {
      var note, noteid;
      noteid = opts.note.id ? opts.note.id : opts.note.noteID;
      note = $('<div id="' + noteid + '" class="note-border"><div class="note-text"><div class="note-text-value">' + opts.note.text + '</div></div></div>');
      opts.note.noteHolder.append(note);
      if (methods.editable) {
        note.find(".note-text").append('<a href="#" class="edit-note">edit</a>');
      }
      note.css({
        width: opts.width + "px",
        left: opts.left + "px",
        height: opts.height + "px",
        top: opts.top + "px"
      });
      methods.bind(note, opts.height);
      return this;
    };
    methods.userCreateBox = function(evt, noteHolder) {
      var note;
      note = $('<div class="note-border"><div class="note-text"></div></div>');
      note.find('.note-text').append(methods.buildEditNode(""));
      noteHolder.append(note);
      note.mousedown(function(md_evt) {
        return md_evt.stopPropagation();
      });
      if (!(/MSIE (\d+\.\d+);/.test(navigator.userAgent))) {
        note.css({
          top: evt.layerY + "px",
          left: evt.layerX + "px",
          width: "50px",
          height: "50px"
        });
      } else {
        note.css({
          top: evt.offsetY + "px",
          left: evt.offsetX + "px",
          width: "50px",
          height: "50px"
        });
      }
      return note;
    };
    methods.updateBoxSize = function(evt, note) {
      var pos;
      pos = note.position();
      return note.css({
        width: Math.abs(pos.left + evt.layerX) + "px",
        height: Math.abs(pos.top + evt.layerY) + "px"
      });
    };
    methods.setNoteTextTop = function(noteText, height) {
      return noteText.css({
        top: height + "px"
      });
    };
    methods.noteHover = function(note, height, noteText) {
      var hovering, _self;
      _self = this;
      hovering = note.hover(function() {
        clearTimeout(_self.timer);
        note.css({
          zIndex: 100
        });
        methods.setNoteTextTop(noteText, height);
        $("div.note-text").hide();
        return noteText.show();
      }, function() {
        clearTimeout(_self.timer);
        note.css({
          zIndex: 200
        });
        return _self.timer = setTimeout(function() {
          return noteText.fadeOut();
        }, 1500);
      });
      return hovering;
    };
    methods.setEditable = function(bool) {
      this.editable = bool;
      return this;
    };
    methods.bind = function(note, height) {
      var hovering, noteText, self;
      noteText = note.find("div.note-text");
      hovering = methods.noteHover(note, height, noteText);
      if (methods.editable) {
        self = this;
        if (note.resizable != null) {
          note.resizable({
            containment: "parent",
            start: function(event, ui) {
              noteText.hide();
              return note.unbind("hover", hovering);
            },
            resize: function(event, ui) {
              noteText.hide();
              return note.unbind("hover", hovering);
            },
            stop: function(event, ui) {
              height = note.height();
              hovering = methods.noteHover(note, height, noteText);
              methods.setNoteTextTop(noteText, height);
              methods.save(note);
              return noteText.show();
            }
          });
        }
        if (note.draggable != null) {
          note.draggable({
            containment: "parent",
            stop: function(event, ui) {
              return methods.save(note);
            }
          });
        }
        note.mousedown(function(evt) {
          return evt.stopPropagation();
        });
        noteText.find("a.save").click(function(evt) {
          evt.preventDefault();
          return methods.add(note);
        });
        noteText.find("a.delete").click(function(evt) {
          evt.preventDefault();
          return methods.remove(note);
        });
        return noteText.find("a.edit-note").click(function(evt) {
          evt.preventDefault();
          return methods.update(note);
        });
      }
    };
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === "object" || !method) {
      return methods.init.apply(this, arguments);
    } else {
      return $.error("Method " + method + " does not exist on jQuery.notes");
    }
  };
}(window.jQuery);
