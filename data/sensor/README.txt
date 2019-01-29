
ファイルは以下の２種類になっています。
・date-time(UTC)-simple-log_teine_machinename.txt
・date-time(UTC)-gnrmc-raw-log_teine_machinename.txt


simple-logには以下のセンサーからのデータが含まれています。
(GPSのサンプリングレートに合わせて記録するプログラムを自動起動で使っていたため、他のセンサーデータのサンプリングレートが低くなってしまいました、。)
・GPS：u-blox NEO-M8P-2-10
・三軸ジャイロセンサ：ITG-3200
・三軸加速度センサ：ADXL345
・電子コンパス：QMC5883L

データフォーマットはdate(UTC),time(UTC),decimal_latitude,decimal_longitude,ADXL345_accel_X,ADXL345_ADXL345_accel_y,ADXL345_accel_z,ITG3200_Gyro_x,ITG3200_Gyro_y,ITG3200_Gyro_z,QMC5883L_magnet_x,QMC5883L_magnet_y,QMC5883L_magnet_z,QMC5883L_bearing,
を”,”で区切ってます。

date(UTC)：9時間時差のため、日本時間9時前は1日ずれ補正する
time(UTC)：2時3分28秒547（UTC）　⇒　11時3分28秒547（JST、+9h）
です。

gnrmc-rawには、GPSのパースする前のデータが入っています。