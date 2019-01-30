BEGIN {
	FS = ","
	cnt = 1

	init = 0	
}

{
	dt = $1
	tm = $2

	if (init == 0) {
		init = 1
		rtime0 = (substr(tm, 1, 2) * 3600) + (substr(tm, 3, 2) * 60) + (substr(tm, 5, 2) * 1)
	}

	rtime = (substr(tm, 1, 2) * 3600) + (substr(tm, 3, 2) * 60) + (substr(tm, 5, 2) * 1)
	rtime -= rtime0
	h = int(rtime / 3600)
	rtime -= h * 3600
	m = int(rtime / 60)
	rtime -= m * 60
	s = rtime

	srtime = sprintf("%02d:%02d:%02d", h, m, s)

	sdate = "20" substr(dt, 5, 2) "-" substr(dt, 3, 2) "-" substr(dt, 1, 2)
    stime = substr(tm, 1, 2) ":" substr(tm, 3, 2) ":" substr(tm, 5, 2)
	datetime = sdate " " stime

	sub(/\[/, "", $12)
	sub(/\]/, "", $14)


#	print "{\"index\":{\"_index\":\"sensor\",\"_type\":\"sensor_data\",\"_id\":\"" cnt "\"}}"
	cnt++

	printf("{")
	printf("\"timestamp\":\"" datetime "\",")
	printf("\"time\":\"" srtime "\",")
	printf("\"location\":{\"lat\":" $3 ",\"lon\":" $4 "},")

	printf("\"accel_x\":" $5 ",")
	printf("\"accel_y\":" $6 ",")
	printf("\"accel_z\":" $7 ",")

	printf("\"gyro_x\":" $8 ",")
	printf("\"gyro_y\":" $9 ",")
	printf("\"gyro_z\":" $10 ",")

	printf("\"magnet_x\":" $12 ",")
	printf("\"magnet_y\":" $13 ",")
	printf("\"magnet_z\":" $14 ",")

	printf("\"bearing\":" $15 "},")

	printf("\n")
}

