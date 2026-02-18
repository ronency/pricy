export function validate(validator) {
  return (req, res, next) => {
    const { error, value } = validator(req.body);

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }));

      return res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details
        }
      });
    }

    req.validatedBody = value;
    next();
  };
}

export function validateQuery(validator) {
  return (req, res, next) => {
    const { error, value } = validator(req.query);

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }));

      return res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details
        }
      });
    }

    req.validatedQuery = value;
    next();
  };
}
