SELECT TOP (1000) [id]
      ,[fecha]
      ,[examen_nombre]
      ,[cantidad]
      ,[fuente]
      ,[fecha_importacion]
      ,[procesado]
      ,[fecha_procesamiento]
  FROM [ControlabIA].[dbo].[tmp_importacion_examenes]

  update tmp_importacion_examenes set procesado = 0 where procesado = 1
 