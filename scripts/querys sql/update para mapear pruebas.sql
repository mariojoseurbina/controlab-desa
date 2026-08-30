SELECT TOP (1000) [id]
      ,[fecha]
      ,[examen_nombre]
      ,[cantidad]
      ,[fuente]
      ,[fecha_importacion]
      ,[procesado]
      ,[fecha_procesamiento]
  FROM [ControlabIA].[dbo].[tmp_importacion_examenes]
  where procesado = 0

  SELECT TOP (1000) [id]
      ,[fecha]
      ,[examen_nombre]
      ,[cantidad]
      ,[fuente]
      ,[fecha_importacion]
      ,[procesado]
      ,[fecha_procesamiento]
  FROM [ControlabIA].[dbo].[tmp_importacion_examenes]
  where procesado = 1



  update tmp_importacion_examenes set procesado = 0 where procesado = 1

