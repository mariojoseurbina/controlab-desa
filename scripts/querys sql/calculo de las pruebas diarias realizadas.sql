use Infolab

SELECT 
    SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 9, 2) + ':00-' + 
    SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 9, 2) + ':59' AS RangoHora,
    COUNT(*) AS TotalExamenes,
    COUNT(DISTINCT E.Reporte) AS TiposExamenDiferentes
FROM Ordenes O
    INNER JOIN Examenes E ON O.idExamen = E.ID
WHERE CAST(SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 1, 8) AS DATE) = '2025-04-25'
GROUP BY SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 9, 2)
ORDER BY RangoHora;


SELECT 
    '2025-04-25' AS Fecha,
    COUNT(*) AS TotalExamenes,
    COUNT(DISTINCT O.idExamen) AS TiposExamenDiferentes,
    COUNT(DISTINCT E.Reporte) AS NombresExamenDiferentes,
    COUNT(Cu.Resultado) AS ExamenesConResultadoNumerico,
    COUNT(Cu.ResultString) AS ExamenesConResultadoTexto,
    ROUND((COUNT(Cu.Resultado) * 100.0 / COUNT(*)), 2) AS PorcentajeCompletadoNumerico,
    ROUND((COUNT(Cu.ResultString) * 100.0 / COUNT(*)), 2) AS PorcentajeCompletadoTexto
FROM Ordenes O
    INNER JOIN Examenes E ON O.idExamen = E.ID
    LEFT OUTER JOIN Cuantitativo Cu ON O.idMuestra = Cu.idMuestra 
                                    AND O.idExamen = Cu.idExamen
WHERE CAST(SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 1, 8) AS DATE) = '2025-04-25';

use Infolab

SELECT 
    E.Reporte AS NombreExamen,
    SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 9, 2) + ':' + 
    SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 11, 2) AS Hora,
    COUNT(*) AS Cantidad
FROM Ordenes O
    INNER JOIN Examenes E ON O.idExamen = E.ID
WHERE CAST(SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 1, 8) AS DATE) = '2025-04-25'
GROUP BY E.Reporte, 
         SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 9, 2),
         SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 11, 2)
ORDER BY NombreExamen, Hora;


use Infolab

SELECT 
    E.Reporte AS NombreExamen,
    COUNT(*) AS TotalRealizados,
    COUNT(Cu.Resultado) AS ConResultadoNumerico,
    COUNT(Cu.ResultString) AS ConResultadoTexto,
    SUM(CASE WHEN Cu.Resultado IS NULL AND Cu.ResultString IS NULL THEN 1 ELSE 0 END) AS SinResultado,
   --ROUND(AVG(CAST(Cu.Resultado AS FLOAT)), 2) AS PromedioResultado,
    --MIN(Cu.Resultado) AS MinimoResultado,
    --MAX(Cu.Resultado) AS MaximoResultado,
    ROUND((COUNT(Cu.Resultado) * 100.0 / COUNT(*)), 2) AS PorcentajeCompletado
FROM Ordenes O
    INNER JOIN Examenes E ON O.idExamen = E.ID
    LEFT OUTER JOIN Cuantitativo Cu ON O.idMuestra = Cu.idMuestra 
                                    AND O.idExamen = Cu.idExamen
WHERE CAST(SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 1, 8) AS DATE) = '2025-04-25'
GROUP BY E.Reporte
ORDER BY TotalRealizados DESC;



////////////ESTE ES EL QUERY QUE EXTRAE LAS PRUEBAS DEL DIA DESDE OTRO LIMS ///////
USE Infolab

SELECT 
    E.Reporte AS NombreExamen,
    COUNT(*) AS TotalRealizados
FROM Ordenes O
    INNER JOIN Examenes E ON O.idExamen = E.ID
WHERE CAST(SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 1, 8) AS DATE) = '2025-04-04'
GROUP BY E.Reporte
ORDER BY TotalRealizados DESC;




 SELECT 
            E.Reporte AS NombreExamen,
            COUNT(*) AS TotalRealizados,
            @Fecha AS Fecha,
            'PENDIENTE' AS Estado,
            @Usuario AS Usuario,
            GETDATE() AS FechaRegistro
        FROM [INFORLAB].[dbo].[Ordenes] O
        INNER JOIN [INFORLAB].[dbo].[Examenes] E ON O.idExamen = E.ID
        WHERE CAST(SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 1, 8) AS DATE) = @Fecha
        GROUP BY E.Reporte
        ORDER BY COUNT(*) DESC;