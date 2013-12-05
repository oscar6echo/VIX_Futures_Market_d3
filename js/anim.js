/* Define the Animation class */
function Animation(frames_nb, container_id, time_slider_id, loop_select_id,
		left_axis_max_slider_id, left_axis_min_slider_id, bottom_axis_max_slider_id, right_axis_max_slider_id,
		second_slider_id, second_slider_value, second_span_id) {

	this.frames_nb = frames_nb;

	this.container_id = container_id;
	this.time_slider_id = time_slider_id;
	this.loop_select_id = loop_select_id;
	this.left_axis_max_slider_id = left_axis_max_slider_id;
	this.left_axis_min_slider_id = left_axis_min_slider_id;
	this.bottom_axis_max_slider_id = bottom_axis_max_slider_id;
	this.right_axis_max_slider_id = right_axis_max_slider_id;
	this.second_slider_id = second_slider_id;
	this.second_span_id = second_span_id;

	this.interval = 250;
	this.current_frame = 0;
	this.direction = 0;
	this.timer = null;
	this.left_axis_max = 30;
	this.left_axis_min = 0;
	this.bottom_axis_max = 270;
	this.right_axis_max = 5000;
	this.second_slider_value = 270;
	this.second = 0;
	this.show_volumes = true;


	document.getElementById(this.time_slider_id).max = this.frames_nb-1;
	draw_init(this.current_frame, this.left_axis_max, this.left_axis_min, this.bottom_axis_max, this.right_axis_max);
	this.set_frame(this.current_frame);
}

Animation.prototype.get_loop_state = function(){
	var button_group = document[this.loop_select_id].state;
	for (var i = 0; i < button_group.length; i++) {
			var button = button_group[i];
			if (button.checked) {
					return button.value;
			}
	}
	return undefined;
}

Animation.prototype.set_frame = function(frame){
	// this.second = 0;
	this.current_frame = Math.min(Math.max(Math.max(0, -this.second), frame), this.frames_nb-1-Math.max(0, this.second));

	document.getElementById(this.time_slider_id).value = this.current_frame;
	document.getElementById(this.second_slider_id).value = this.second;
	document.getElementById(this.second_span_id).innerHTML = this.second;
	draw_update(this.current_frame, this.second, this.left_axis_max, this.left_axis_min, this.bottom_axis_max, this.right_axis_max, this.show_volumes);
}

Animation.prototype.set_left_axis_max = function(left_axis_max) {
	this.left_axis_max = left_axis_max;
	document.getElementById(this.left_axis_max_slider_id).value = this.left_axis_max;
	draw_update(this.current_frame, this.second, this.left_axis_max, this.left_axis_min, this.bottom_axis_max, this.right_axis_max, this.show_volumes);
};

Animation.prototype.set_left_axis_min = function(left_axis_min) {
	this.left_axis_min = left_axis_min;
	document.getElementById(this.left_axis_min_slider_id).value = this.left_axis_min;
	draw_update(this.current_frame, this.second, this.left_axis_max, this.left_axis_min, this.bottom_axis_max, this.right_axis_max, this.show_volumes);
};

Animation.prototype.set_bottom_axis_max = function(bottom_axis_max) {
	this.bottom_axis_max = bottom_axis_max;
	document.getElementById(this.bottom_axis_max_slider_id).value = this.bottom_axis_max;
	draw_update(this.current_frame, this.second, this.left_axis_max, this.left_axis_min, this.bottom_axis_max, this.right_axis_max, this.show_volumes);
};

Animation.prototype.set_right_axis_max = function(right_axis_max) {
	this.right_axis_max = right_axis_max;
	document.getElementById(this.right_axis_max_slider_id).value = this.right_axis_max;
	draw_update(this.current_frame, this.second, this.left_axis_max, this.left_axis_min, this.bottom_axis_max, this.right_axis_max, this.show_volumes);
};

Animation.prototype.set_second = function(second) {
	this.second = second;
	document.getElementById(this.second_slider_id).value = this.second;
	document.getElementById(this.second_span_id).innerHTML = this.second;
	draw_update(this.current_frame, this.second, this.left_axis_max, this.left_axis_min, this.bottom_axis_max, this.right_axis_max, this.show_volumes);
};

Animation.prototype.set_show_volumes = function(cb) {
	console.log("Clicked, show_volumes=" + cb.checked);
	this.show_volumes = cb.checked;
	draw_update(this.current_frame, this.second, this.left_axis_max, this.left_axis_min, this.bottom_axis_max, this.right_axis_max, this.show_volumes);
};


Animation.prototype.next_frame = function()
{
	this.set_frame(Math.min(this.frames_nb - 1 - Math.max(0, this.second), this.current_frame + 1));
}

Animation.prototype.previous_frame = function()
{
	this.set_frame(Math.max(Math.max(0, -this.second), this.current_frame - 1));
}

Animation.prototype.first_frame = function()
{
	this.set_frame(Math.max(0, -this.second));
}

Animation.prototype.last_frame = function()
{
	this.set_frame(this.frames_nb - 1 - Math.max(0, this.second));
}

Animation.prototype.slower = function()
{
	this.interval /= 0.7;
	if(this.direction > 0){this.play_animation();}
	else if(this.direction < 0){this.reverse_animation();}
}

Animation.prototype.faster = function()
{
	this.interval *= 0.7;
	if(this.direction > 0){this.play_animation();}
	else if(this.direction < 0){this.reverse_animation();}
}

Animation.prototype.anim_step_forward = function()
{
	this.current_frame += 1;
	if(this.current_frame < this.frames_nb - Math.max(0, this.second)){
		this.set_frame(this.current_frame);
	}else{
		var loop_state = this.get_loop_state();
		if(loop_state == "loop"){
			this.first_frame();
		}else if(loop_state == "reflect"){
			this.last_frame();
			this.reverse_animation();
		}else{
			this.pause_animation();
			this.last_frame();
		}
	}
}

Animation.prototype.anim_step_reverse = function()
{
	this.current_frame -= 1;
	if(this.current_frame >= Math.max(0, -this.second)){
		this.set_frame(this.current_frame);
	}else{
		var loop_state = this.get_loop_state();
		if(loop_state == "loop"){
			this.last_frame();
		}else if(loop_state == "reflect"){
			this.first_frame();
			this.play_animation();
		}else{
			this.pause_animation();
			this.first_frame();
		}
	}
}

Animation.prototype.pause_animation = function()
{
	this.direction = 0;
	if (this.timer){
		clearInterval(this.timer);
		this.timer = null;
	}
}

Animation.prototype.play_animation = function()
{
	this.pause_animation();
	this.direction = 1;
	var t = this;
	if (!this.timer) this.timer = setInterval(function(){t.anim_step_forward();}, this.interval);
}

Animation.prototype.reverse_animation = function()
{
	this.pause_animation();
	this.direction = -1;
	var t = this;
	if (!this.timer) this.timer = setInterval(function(){t.anim_step_reverse();}, this.interval);
}
