DROP TABLE IF EXISTS mega_users;

CREATE TABLE mega_users (
  id varchar(36) NOT NULL,
  firstName varchar(255) default NULL,
  lastName varchar(255) default NULL,
  email varchar(255) default NULL
);

DROP PROCEDURE IF EXISTS megaUsersSetup;
DELIMITER $$
CREATE PROCEDURE megaUsersSetup()
BEGIN
  DECLARE i INT DEFAULT 1;

  WHILE i < 1000000 DO
    INSERT INTO mega_users (id,firstName,lastName,email)
    VALUES (i, 'Hayes','Cruz','dui@aliquetsem.org'),
        (i + 1,'Addison','Mcdonald','consectetuer.adipiscing.elit@Duissit.co.uk'),
        (i + 2,'Dante','Hammond','et.arcu.imperdiet@euduiCum.ca'),
        (i + 3,'Vivien','Davis','Suspendisse.tristique@enimCurabiturmassa.net'),
        (i + 4,'Nehru','Moss','vel.turpis@condimentum.com'),
        (i + 5,'Orlando','Cameron','elementum.lorem@arcuVestibulumante.com'),
        (i + 6,'Cheryl','Pitts','tortor.dictum.eu@cursus.edu'),
        (i + 7,'Rae','Aguilar','semper.dui.lectus@dui.com'),
        (i + 8,'Rafael','Flynn','sollicitudin.a.malesuada@nibh.edu'),
        (i + 9,'Zachery','Peterson','vitae@vel.com');

    SET i = i + 10;
  END WHILE;
END;
$$

CALL megaUsersSetup();
DROP PROCEDURE IF EXISTS megaUsersSetup;