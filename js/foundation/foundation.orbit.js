;(function ($, window, document, undefined) {
  'use strict';

  Foundation.libs = Foundation.libs || {};

  Foundation.libs.orbit = {
    version: '4.0.0.alpha',

    settings: {
      timer_speed: 10000,
      animation_speed: 500,
      bullets: true,
      container_class: 'orbit-container',
      next_class: 'orbit-next',
      prev_class: 'orbit-prev',
      timer_class: 'orbit-timer',
      timer_paused_class: 'paused',
      timer_progress_class: 'orbit-progress',
      slides_container_class: 'orbit-slides-container',
      bullets_container_class: 'orbit-bullets',
      bullets_active_class: 'active',
      caption_class: 'orbit-caption',
      active_class: 'active',
      orbit_transition_class: 'orbit-transitioning'
    },

    init: function (scope, method, options) {
      var self = this;

      if (typeof method === 'object') {
        $.extend(true, self.settings, method);
      }

      $('[data-orbit]', scope).each($.proxy(self._init, self));
    },

    _container_html: function() {
      var self = this;
      return '<div class="' + self.settings.container_class + '"></div>';
    },

    _bullets_container_html: function($slides) {
      var self = this,
          $list = $('<ol class="' + self.settings.bullets_container_class + '"></ol>');
      $slides.each(function(idx, slide) {
        var $item = $('<li data-orbit-slide-number="' + (idx+1) + '" class=""></li>');
        if (idx === 0) {
          $item.addClass(self.settings.bullets_active_class);
        }
        $list.append($item);
      });
      return $list;
    },

    _bullet_html: function() {
      var self = this;
    },

    _timer_html: function() {
      var self = this;
      return '<div class="' + self.settings.timer_class
        + '"><span></span><div class="' + self.settings.timer_progress_class
        + '"></div></div>';
    },

    _next_html: function() {
      var self = this;
      return '<a href="#" class="' + self.settings.next_class + '">Next <span></span></a>';
    },

    _prev_html: function() {
      var self = this;
      return '<a href="#" class="' + self.settings.prev_class + '">Prev <span></span></a>';
    },

    _init: function (idx, slider) {
      var self = this,
          $slides_container = $(slider),
          $container = $slides_container.wrap(self._container_html()).parent(),
          $slides = $slides_container.children();

      $container.append(self._prev_html());
      $container.append(self._next_html());
      $slides_container.addClass(self.settings.slides_container_class);
      $container.append(self._timer_html());
      if (self.settings.bullets) {
        $container.after(self._bullets_container_html($slides));
      }
      // To better support the "sliding" effect it's easier
      // if we just clone the first and last slides
      $slides_container.append($slides.first().clone());
      $slides_container.prepend($slides.last().clone());
      // Make the first "real" slide active
      $slides_container.css('marginLeft', '-100%');
      $slides.first().addClass(self.settings.active_class);

      self._init_events($slides_container);
      self._init_dimensions($slides_container);
      self._start_timer($slides_container);
    },

    _init_events: function ($slides_container) {
      var self = this,
          $container = $slides_container.parent();

      $(window).on('load', function() {
        $slides_container.height('');
        $slides_container.height($slides_container.height($container.height()));
      });

      $(window).on('resize', function() {
        $slides_container.height('');
        $slides_container.height($slides_container.height($container.height()));
      });

      $(document).on('click', '[data-orbit-link]', function(e) {
        var id = $(e.currentTarget).attr('data-orbit-link'),
            $slide = $slides_container.find('[data-orbit-slide=' + id + ']').first();

        if ($slide.length === 1) {
          self._rebuild_timer($container, '0%');
          self.goto($slides_container, $slide.index(), function() {});
        }
      });

      $container.siblings('.' + self.settings.bullets_container_class)
        .on('click', '[data-orbit-slide-number]', function(e) {
          e.preventDefault();
          self._rebuild_timer($container, '0%');
          self.goto($slides_container, $(e.currentTarget).data('orbit-slide-number'),function() {});
        });

      $container
        .on('click', '.' + self.settings.next_class, function(e) {
          e.preventDefault();
          self._rebuild_timer($container, '0%');
          self.goto($slides_container, 'next', function() {});
        })
        .on('click', '.' + self.settings.prev_class, function(e) {
          e.preventDefault();
          self._rebuild_timer($container, '0%');
          self.goto($slides_container, 'prev', function() {});
        })
        .on('click', '.' + self.settings.timer_class, function(e) {
          e.preventDefault();
          var $timer = $(e.currentTarget).toggleClass(self.settings.timer_paused_class),
              $slides_container = $timer.closest('.' + self.settings.container_class)
                .find('.' + self.settings.slides_container_class);

          if ($timer.hasClass(self.settings.timer_paused_class)) {
            self._stop_timer($slides_container);
          } else {
            self._start_timer($slides_container);
          }
        })
        .on('touchstart', function(e) {
          var data = {
            start_page_x: e.touches[0].pageX,
            start_page_y: e.touches[0].pageY,
            start_time: (new Date()).getTime(),
            delta_x: 0,
            is_scrolling: undefined
          };
          $container.data('swipe-transition', data);
          e.stopPropagation();
        })
        .on('touchmove', function(e) {
          // Ignore pinch/zoom events
          if(e.touches.length > 1 || e.scale && e.scale !== 1) return;

          var data = $container.data('swipe-transition');
          if (typeof data === 'undefined') {
            data = {};
          }

          data.delta_x = e.touches[0].pageX - data.start_page_x;

          if ( typeof data.is_scrolling === 'undefined') {
            data.is_scrolling = !!( data.is_scrolling || Math.abs(data.delta_x) < Math.abs(e.touches[0].pageY - data.start_page_y) );
          }

          if (!data.is_scrolling && !data.active) {
            e.preventDefault();
            self._stop_timer($slides_container);
            var direction = (data.delta_x < 0) ? 'next' : 'prev';
            data.active = true;
            self.goto($slides_container, direction, function() {});
          }
        })
        .on('touchend', function(e) {
          $container.data('swipe-transition', {});
          e.stopPropagation();
        });
    },

    _init_dimensions: function ($slides_container) {
      var $container = $slides_container.parent(),
          $slides = $slides_container.children();

      $slides_container.css('width', $slides.length * 100 + '%');
      $slides.css('width', 100 / $slides.length + '%');
      $slides_container.height($container.height());
      $slides_container.css('width', $slides.length * 100 + '%');
    },

    _start_timer: function ($slides_container) {
      var self = this,
          $container = $slides_container.parent();

      var callback = function() {
        self._rebuild_timer($container, '0%');
        self.goto($slides_container, 'next', function() {
          self._start_timer($slides_container);
        });
      };

      var $timer = $container.find('.' + self.settings.timer_class),
          $progress = $timer.find('.' + self.settings.timer_progress_class),
          progress_pct = ($progress.width() / $timer.width()),
          delay = self.settings.timer_speed - (progress_pct * self.settings.timer_speed);

      $progress.animate({'width': '100%'}, delay, 'linear', callback);
    },

    _stop_timer: function ($slides_container) {
      var self = this,
          $container = $slides_container.parent(),
          $timer = $container.find('.' + self.settings.timer_class),
          $progress = $timer.find('.' + self.settings.timer_progress_class),
          progress_pct = $progress.width() / $timer.width()
      self._rebuild_timer($container, progress_pct * 100 + '%');
    },

    _rebuild_timer: function ($container, width_pct) {
      // Zepto is unable to stop animations since they
      // are css-based. This is a workaround for that
      // limitation, which rebuilds the dom element
      // thus stopping the animation
      var self = this,
          $timer = $container.find('.' + self.settings.timer_class),
          $new_timer = $(self._timer_html()),
          $new_timer_progress = $new_timer.find('.' + self.settings.timer_progress_class);

      $timer.remove();
      $container.append($new_timer);
      $new_timer_progress.css('width', width_pct);
      $new_timer.addClass(self.settings.timer_paused_class);
    },

    goto: function($slides_container, index_or_direction, callback) {
      var self = this,
          $container = $slides_container.parent(),
          $slides = $slides_container.children(),
          $active_slide = $slides_container.find('.' + self.settings.active_class),
          active_index = $active_slide.index();

      if ($container.hasClass(self.settings.orbit_transition_class)) {
        return false;
      }

      if (index_or_direction === 'prev') {
        if (active_index === 0) {
          active_index = $slides.length - 1;
        }
        else {
          active_index--;
        }
      }
      else if (index_or_direction === 'next') {
        active_index = (active_index+1) % $slides.length;
      }
      else if (typeof index_or_direction === 'number') {
        active_index = (index_or_direction % $slides.length);
      }
      if (active_index === ($slides.length - 1) && index_or_direction === 'next') {
        $slides_container.css('marginLeft', '0%');
        active_index = 1;
      }
      else if (active_index === 0 && index_or_direction === 'prev') {
        $slides_container.css('marginLeft', '-' + ($slides.length - 1) * 100 + '%');
        active_index = $slides.length - 2;
      }
      // Start transition, make next slide active
      $container.addClass(self.settings.orbit_transition_class);
      $active_slide.removeClass(self.settings.active_class);
      $($slides[active_index]).addClass(self.settings.active_class);
      // Make next bullet active
      var $bullets = $container.find('.' + self.settings.bullets_container_class);
      if ($bullets.length === 1) {
        $bullets.children().removeClass(self.settings.bullets_active_class);
        $($bullets.children()[active_index-1]).addClass(self.settings.bullets_active_class);
      }
      var new_margin_left = '-' + (active_index * 100) + '%';
      // Check to see if animation will occur, otherwise perform
      // callbacks manually
      if ($slides_container.css('marginLeft') === new_margin_left) {
        $container.removeClass(self.settings.orbit_transition_class);
        callback();
      } else {
        $slides_container.animate({
          'marginLeft' : new_margin_left
        }, self.settings.animation_speed, 'ease', function() {
          $container.removeClass(self.settings.orbit_transition_class);
          callback();
        });
      }
    }
  };
}(Foundation.zj, this, this.document));