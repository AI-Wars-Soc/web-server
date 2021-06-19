const leaderboard = (function () {
    const obj = {};

    const duration = 1000;
    const delta = 250;

    const seenBefore = localStorage.seenLeaderboard === '1';
    localStorage.seenLeaderboard = '1';

    function _gcd_two(a, b) {
        if (b === 0)
            return a;
        return _gcd_two(b, a % b);
    }

    function gcd(...arr) {
        let ans = arr[0];

        for (let i = 1; i < arr.length; i++) {
            ans = _gcd_two(arr[i], ans);
        }

        return ans;
    }

    function convert_date(unix) {
        const date = new Date(unix * 1000);

        const day = date.getDate();
        const month = date.getMonth();
        const hours = date.getHours();
        const minutes = "0" + date.getMinutes();

        return day + "/" + month + " " + hours + ':' + minutes.substr(-2);
    }

    obj.reset = function () {
        localStorage.seenLeaderboard = '0';
    }

    function get_entry_id(index) {
        return "leaderboard-entry-" + (index + 1);
    }

    function get_leaderboard_item(index) {
        return $("#" + get_entry_id(index));
    }

    function fade_in(f_after) {
        if (seenBefore) {
            f_after();
            return;
        }

        let index = 0;
        let item = get_leaderboard_item(index);
        while (item.length !== 0) {
            const delay = delta * index;
            item.hide();
            window.setTimeout(fade_in_one, delay, item, duration);

            index++;
            item = get_leaderboard_item(index);
        }
        window.setTimeout(f_after, delta * index + duration);
    }

    function fade_in_one(entry, duration) {
        entry.show("slide", {direction: "right"}, duration);
    }

    function get_graph_data(users, deltas, initial_score) {
        // Get all sampled time steps
        let timestamp_set = new Set();
        for (let i = 0; i < deltas.length; i++) {
            const delta = deltas[i];
            timestamp_set.add(delta.time);
        }
        const referenced_timestamps = Array.from(timestamp_set);
        const timestep = gcd(...referenced_timestamps);
        const timestamp_min = Math.min(...referenced_timestamps) - timestep;
        const timestamp_max = Math.max(...referenced_timestamps);

        // Fill in blanks
        let timestamps = [];
        let labels = [];
        let timestamp = timestamp_min;
        let timestamp_i = 0;
        while (timestamp <= timestamp_max) {
            timestamps.push(timestamp);
            labels.push(convert_date(timestamp));
            timestamp += timestep;
            timestamp_i += 1;
        }

        // Make user data
        const user_id_points = new Map();
        const user_ids = Array.from(Object.keys(users));
        for (let i = 0; i < user_ids.length; i++) {
            const user_id = user_ids[i];
            const points = new Array(timestamps.length);
            points.fill(NaN);
            user_id_points.set(user_id, points);
        }

        // Populate user data
        // TODO: This can be done in O(n) in two passes by storing diffs then sweeping rather than O(n^2)
        for (let i = 0; i < deltas.length; i++) {
            const this_delta = deltas[i];
            const timestamp_i = Math.round((this_delta.time - timestamp_min) / timestep);
            const points = user_id_points.get("" + this_delta.user_id);

            if (timestamp_i > 0 && isNaN(points[timestamp_i - 1])) {
                points[timestamp_i - 1] = initial_score;
            }
            for (let j = timestamp_i; j < points.length; j++) {
                if (isNaN(points[j])) {
                    points[j] = initial_score;
                }
                points[j] += this_delta.delta;
            }
        }

        // Make full data array
        let datasets = [];
        for (let i = 0; i < user_ids.length; i++) {
            const user_id = user_ids[i];
            const user = users[user_id]

            let color = "#676767";
            if (user.is_you === true) {
                color = "#2D7DD2";
            } else if (user.is_bot === true) {
                color = "#90001C";
            }

            datasets.push({
                label: user.display_name,
                data: user_id_points.get(user_id),
                fill: false,
                radius: 1,
                hitRadius: 3,
                hoverRadius: 6,
                borderColor: color,
                cubicInterpolationMode: 'monotone',
                tension: 0.4
            });
        }
        return {
            labels: labels,
            datasets: datasets
        };
    }

    function get_graph_config(users, deltas, initial_score) {
        return {
            type: 'line',
            data: get_graph_data(users, deltas, initial_score),
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: false,
                        text: 'Leaderboard'
                    },
                },
                interaction: {
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Score'
                        },
                    }
                }
            },
        }
    }

    function make_graph() {
        // Make graph object
        $("#overTimeChartContainer").html($("<canvas />", {id: "overTimeChart"}).hide());

        $.post('/api/get_leaderboard_over_time')
            .then(response => {
                const ctx = document.getElementById('overTimeChart').getContext('2d');
                const config = get_graph_config(response.data.users, response.data.deltas, response.data.initial_score);
                new Chart(ctx, config);

                const chart_jquery = $("#overTimeChart");
                if (seenBefore) {
                    chart_jquery.show();
                } else {
                    chart_jquery.show("blind");
                }
            });
    }

    templates.add_function_post_generate(() => {
        fade_in(() => make_graph());
    })
}());
