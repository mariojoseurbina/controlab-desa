use Infolab

-- Solo para verificar el conteo de hematologías
DECLARE @Fecha DATE = '2025-04-25';

-- Total de hematologías
SELECT 'Total Hematologías' AS Tipo, COUNT(*) AS Cantidad
FROM Ordenes O
INNER JOIN Examenes E ON O.idExamen = E.ID
WHERE CAST(SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 1, 8) AS DATE) = @Fecha
AND E.Reporte LIKE '%HEMATOL%'

UNION ALL

-- Hematologías individuales (excluyendo perfiles)
SELECT 'Hematologías Individuales' AS Tipo, COUNT(*) AS Cantidad
FROM Ordenes O
INNER JOIN Examenes E ON O.idExamen = E.ID
WHERE CAST(SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 1, 8) AS DATE) = @Fecha
AND E.Reporte LIKE '%HEMATOL%'
AND O.idMuestra NOT IN (
    SELECT DISTINCT O2.idMuestra
    FROM Ordenes O2
    INNER JOIN Examenes E2 ON O2.idExamen = E2.ID
    WHERE CAST(SUBSTRING(CAST(O2.idMuestra AS VARCHAR(20)), 1, 8) AS DATE) = @Fecha
    AND E2.Reporte LIKE 'PERFIL%'
)

UNION ALL

-- Hematologías dentro de perfiles
SELECT 'Hematologías en Perfiles' AS Tipo, COUNT(*) AS Cantidad
FROM Ordenes O
INNER JOIN Examenes E ON O.idExamen = E.ID
WHERE CAST(SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 1, 8) AS DATE) = @Fecha
AND E.Reporte LIKE '%HEMATOL%'
AND O.idMuestra IN (
    SELECT DISTINCT O2.idMuestra
    FROM Ordenes O2
    INNER JOIN Examenes E2 ON O2.idExamen = E2.ID
    WHERE CAST(SUBSTRING(CAST(O2.idMuestra AS VARCHAR(20)), 1, 8) AS DATE) = @Fecha
    AND E2.Reporte LIKE 'PERFIL%'
);



DECLARE @Fecha DATE = '2025-04-25';

-- Identificar muestras que tienen perfiles
WITH MuestrasConPerfil AS (
    SELECT DISTINCT O.idMuestra
    FROM Ordenes O
    INNER JOIN Examenes E ON O.idExamen = E.ID
    WHERE CAST(SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 1, 8) AS DATE) = @Fecha
    AND E.Reporte LIKE 'PERFIL%'
),
-- Contar hematologías que NO están en perfiles
HematologiasIndividuales AS (
    SELECT COUNT(*) AS Cantidad
    FROM Ordenes O
    INNER JOIN Examenes E ON O.idExamen = E.ID
    WHERE CAST(SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 1, 8) AS DATE) = @Fecha
    AND E.Reporte LIKE '%HEMATOL%'
    AND O.idMuestra NOT IN (SELECT idMuestra FROM MuestrasConPerfil)
),
-- Contar total de hematologías (incluyendo las de perfiles)
HematologiasTotales AS (
    SELECT COUNT(*) AS Cantidad
    FROM Ordenes O
    INNER JOIN Examenes E ON O.idExamen = E.ID
    WHERE CAST(SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 1, 8) AS DATE) = @Fecha
    AND E.Reporte LIKE '%HEMATOL%'
)
SELECT 
    E.Reporte AS NombreExamen,
    CASE 
        WHEN E.Reporte LIKE '%HEMATOL%' THEN (SELECT Cantidad FROM HematologiasIndividuales)
        ELSE COUNT(*)
    END AS CantidadReal,
    COUNT(Cu.Resultado) AS ConResultado,
    @Fecha AS Fecha
FROM Ordenes O
    INNER JOIN Examenes E ON O.idExamen = E.ID
    LEFT OUTER JOIN Cuantitativo Cu ON O.idMuestra = Cu.idMuestra 
                                    AND O.idExamen = Cu.idExamen
WHERE CAST(SUBSTRING(CAST(O.idMuestra AS VARCHAR(20)), 1, 8) AS DATE) = @Fecha
GROUP BY E.Reporte
ORDER BY CantidadReal DESC;